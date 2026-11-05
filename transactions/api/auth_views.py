import json

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.base_user import BaseUserManager
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.http import HttpResponse, JsonResponse
from django.views.csrf import csrf_failure as django_csrf_failure
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods, require_POST
from django.contrib.auth.password_validation import validate_password
from django_ratelimit.core import get_usage


REGISTER_LIMITS = (
    ("auth-register-ip", "ip", "30/h"),
)

ACCOUNT_PASSWORD_LIMITS = (
    ("auth-account-password", "user", "5/15m"),
)


def _login_limits(username):
    return (
        ("auth-login-ip", "ip", "20/15m"),
        ("auth-login-username", lambda group, request: username.lower(), "5/15m"),
    )


def _blocked_for(request, limits):
    for group, key, rate in limits:
        usage = get_usage(request, group=group, key=key, rate=rate)
        if usage is not None and usage["count"] >= usage["limit"]:
            return max(usage["time_left"], 1)

    return None


def _count_attempt(request, limits):
    for group, key, rate in limits:
        get_usage(request, group=group, key=key, rate=rate, increment=True)


def _too_many_attempts(retry_after):
    response = _json_response(
        {"detail": "Muitas tentativas. Aguarde alguns minutos e tente novamente."},
        status=429,
    )
    response["Retry-After"] = str(retry_after)
    return response


def _json_payload(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None

    return payload if isinstance(payload, dict) else None


def _json_response(data, status=200):
    response = JsonResponse(data, status=status)
    response["Cache-Control"] = "no-store"
    return response


def _user_data(user):
    return {
        "id": user.pk,
        "username": user.get_username(),
        "email": user.email,
    }


def _clean_username(raw_username, candidate, exclude_pk=None):
    if not isinstance(raw_username, str) or not raw_username.strip():
        return None, "Informe o nome de usuário."

    User = get_user_model()
    username_field = User._meta.get_field(User.USERNAME_FIELD)

    try:
        username = username_field.clean(raw_username.strip(), candidate)
    except ValidationError:
        return None, "Informe um nome de usuário válido."

    if User._default_manager.filter(
        **{User.USERNAME_FIELD: username}
    ).exclude(pk=exclude_pk).exists():
        return None, "Este nome de usuário não está disponível."

    return username, None


def _clean_email(raw_email, exclude_pk=None):
    if not isinstance(raw_email, str) or not raw_email.strip():
        return None, "Informe seu e-mail."

    email = BaseUserManager.normalize_email(raw_email.strip())

    try:
        if len(email) > 254:
            raise ValidationError("E-mail longo demais.")
        validate_email(email)
    except ValidationError:
        return None, "Informe um e-mail válido."

    if get_user_model()._default_manager.filter(
        email__iexact=email
    ).exclude(pk=exclude_pk).exists():
        return None, "Este e-mail já está em uso."

    return email, None


def csrf_failure(request, reason=""):
    if request.path.startswith("/api/"):
        return _json_response(
            {"detail": "Falha na verificação CSRF. Atualize o token e tente novamente."},
            status=403,
        )

    return django_csrf_failure(request, reason=reason)


@never_cache
@require_GET
@ensure_csrf_cookie
def csrf_cookie(request):
    return _json_response({"detail": "Cookie CSRF preparado."})


@never_cache
@require_GET
def session_status(request):
    if not request.user.is_authenticated:
        return _json_response({
            "authenticated": False,
            "user": None,
        })

    return _json_response({
        "authenticated": True,
        "user": _user_data(request.user),
    })


@never_cache
@csrf_protect
@require_POST
def login_view(request):
    payload = _json_payload(request)
    if payload is None:
        return _json_response(
            {"detail": "Envie um objeto JSON válido."},
            status=400,
        )

    username = payload.get("username")
    password = payload.get("password")

    if not isinstance(username, str) or not username.strip():
        return _json_response(
            {"detail": "Informe o nome de usuário."},
            status=400,
        )

    if not isinstance(password, str) or not password:
        return _json_response(
            {"detail": "Informe a senha."},
            status=400,
        )

    limits = _login_limits(username.strip())
    retry_after = _blocked_for(request, limits)
    if retry_after:
        return _too_many_attempts(retry_after)

    user = authenticate(
        request,
        username=username.strip(),
        password=password,
    )

    if user is None:
        _count_attempt(request, limits)
        return _json_response(
            {"detail": "Usuário ou senha inválidos."},
            status=401,
        )

    login(request, user)
    return _json_response({
        "authenticated": True,
        "user": _user_data(user),
    })


@never_cache
@csrf_protect
@require_POST
def register_view(request):
    retry_after = _blocked_for(request, REGISTER_LIMITS)
    if retry_after:
        return _too_many_attempts(retry_after)

    _count_attempt(request, REGISTER_LIMITS)

    payload = _json_payload(request)
    if payload is None:
        return _json_response(
            {"detail": "Envie um objeto JSON válido."},
            status=400,
        )

    raw_username = payload.get("username")
    password = payload.get("password")
    password_confirmation = payload.get("password_confirmation")
    errors = {}

    User = get_user_model()
    candidate = User()

    username, username_error = _clean_username(raw_username, candidate)
    if username_error:
        errors["username"] = [username_error]
    else:
        setattr(candidate, User.USERNAME_FIELD, username)

    if not isinstance(password, str) or not password:
        errors["password"] = ["Informe uma senha."]

    if not isinstance(password_confirmation, str) or not password_confirmation:
        errors["password_confirmation"] = ["Confirme a senha."]
    elif isinstance(password, str) and password != password_confirmation:
        errors["password_confirmation"] = ["As senhas não coincidem."]

    if isinstance(password, str) and password and username is not None:
        try:
            validate_password(password, user=candidate)
        except ValidationError as error:
            errors["password"] = error.messages

    if errors:
        return _json_response(
            {
                "detail": "Revise os dados do cadastro.",
                "errors": errors,
            },
            status=400,
        )

    try:
        with transaction.atomic():
            user = User._default_manager.create_user(
                **{
                    User.USERNAME_FIELD: username,
                    "password": password,
                }
            )
    except IntegrityError:
        # Só trata como nome indisponível se outro cadastro venceu a corrida
        # entre a validação e o INSERT. Qualquer outra falha de integridade
        # é um erro inesperado e deve continuar visível (500 + log).
        username_taken = User._default_manager.filter(
            **{User.USERNAME_FIELD: username}
        ).exists()

        if not username_taken:
            raise

        return _json_response(
            {
                "detail": "Revise os dados do cadastro.",
                "errors": {
                    "username": [
                        "Este nome de usuário não está disponível."
                    ],
                },
            },
            status=400,
        )

    # O projeto usa o backend padrão do Django e não define outros backends.
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")

    return _json_response({
        "authenticated": True,
        "user": _user_data(user),
    }, status=201)


@never_cache
@csrf_protect
@require_POST
def logout_view(request):
    logout(request)
    return HttpResponse(status=204)


def _update_account(request, user):
    payload = _json_payload(request)
    if payload is None:
        return _json_response(
            {"detail": "Envie um objeto JSON válido."},
            status=400,
        )

    if "username" not in payload and "email" not in payload:
        return _json_response(
            {"detail": "Envie o nome de usuário ou o e-mail para alterar."},
            status=400,
        )

    User = get_user_model()
    errors = {}
    changes = {}

    if "username" in payload:
        username, error = _clean_username(payload["username"], user, exclude_pk=user.pk)
        if error:
            errors["username"] = [error]
        elif username != user.get_username():
            changes[User.USERNAME_FIELD] = username

    if "email" in payload:
        email, error = _clean_email(payload["email"], exclude_pk=user.pk)
        if error:
            errors["email"] = [error]
        elif email != user.email:
            changes["email"] = email

    if "email" in changes:
        password = payload.get("password")

        if not isinstance(password, str) or not password:
            errors["password"] = ["Confirme sua senha para alterar o e-mail."]
        else:
            retry_after = _blocked_for(request, ACCOUNT_PASSWORD_LIMITS)
            if retry_after:
                return _too_many_attempts(retry_after)

            if not user.check_password(password):
                _count_attempt(request, ACCOUNT_PASSWORD_LIMITS)
                errors["password"] = ["Senha incorreta."]

    if errors:
        return _json_response(
            {
                "detail": "Revise os dados do perfil.",
                "errors": errors,
            },
            status=400,
        )

    if changes:
        for field, value in changes.items():
            setattr(user, field, value)

        try:
            with transaction.atomic():
                user.save(update_fields=list(changes))
        except IntegrityError:
            others = User._default_manager.exclude(pk=user.pk)
            conflicts = {}

            if User.USERNAME_FIELD in changes and others.filter(
                **{User.USERNAME_FIELD: changes[User.USERNAME_FIELD]}
            ).exists():
                conflicts["username"] = ["Este nome de usuário não está disponível."]

            if "email" in changes and others.filter(
                email__iexact=changes["email"]
            ).exists():
                conflicts["email"] = ["Este e-mail já está em uso."]

            if not conflicts:
                raise

            return _json_response(
                {
                    "detail": "Revise os dados do perfil.",
                    "errors": conflicts,
                },
                status=400,
            )

    return _json_response({"user": _user_data(user)})


@never_cache
@csrf_protect
@require_http_methods(["GET", "PATCH", "DELETE"])
def account_view(request):
    """GET mostra o que será apagado; PATCH edita o perfil; DELETE exclui a conta (LGPD, art. 18)."""
    if not request.user.is_authenticated:
        return _json_response(
            {"detail": "Sessão expirada ou usuário não autenticado."},
            status=401,
        )

    user = request.user

    if request.method == "GET":
        return _json_response({
            "user": _user_data(user),
            "transactions": user.transactions.count(),
            "categories": user.categories.count(),
        })

    if request.method == "PATCH":
        return _update_account(request, user)

    payload = _json_payload(request)
    if payload is None:
        return _json_response(
            {"detail": "Envie um objeto JSON válido."},
            status=400,
        )

    # Ação destrutiva pede a senha de novo: uma sessão aberta num computador
    # esquecido não basta para apagar a conta de alguém.
    password = payload.get("password")

    if not isinstance(password, str) or not password:
        return _json_response(
            {
                "detail": "Confirme sua senha para excluir a conta.",
                "errors": {"password": ["Informe sua senha."]},
            },
            status=400,
        )

    retry_after = _blocked_for(request, ACCOUNT_PASSWORD_LIMITS)
    if retry_after:
        return _too_many_attempts(retry_after)

    if not user.check_password(password):
        _count_attempt(request, ACCOUNT_PASSWORD_LIMITS)
        return _json_response(
            {
                "detail": "Senha incorreta.",
                "errors": {"password": ["Senha incorreta."]},
            },
            status=400,
        )

    # Categorias e transações saem junto (CASCADE em user; a categoria da
    # transação é RESTRICT, que permite apagar quando tudo vai na mesma operação).
    with transaction.atomic():
        user.delete()

    # Encerra a sessão atual. Outras sessões abertas deixam de valer sozinhas,
    # porque o usuário a que apontam não existe mais.
    logout(request)

    return HttpResponse(status=204)
