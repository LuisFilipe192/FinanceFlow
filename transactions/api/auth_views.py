import json

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import HttpResponse, JsonResponse
from django.views.csrf import csrf_failure as django_csrf_failure
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from django.contrib.auth.password_validation import validate_password


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
    }


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

    user = authenticate(
        request,
        username=username.strip(),
        password=password,
    )

    if user is None:
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

    if not isinstance(raw_username, str) or not raw_username.strip():
        errors["username"] = ["Informe o nome de usuário."]

    if not isinstance(password, str) or not password:
        errors["password"] = ["Informe uma senha."]

    if not isinstance(password_confirmation, str) or not password_confirmation:
        errors["password_confirmation"] = ["Confirme a senha."]
    elif isinstance(password, str) and password != password_confirmation:
        errors["password_confirmation"] = ["As senhas não coincidem."]

    User = get_user_model()
    username = None
    candidate = User()

    if "username" not in errors:
        username_field = User._meta.get_field(User.USERNAME_FIELD)
        try:
            username = username_field.clean(raw_username.strip(), candidate)
            setattr(candidate, User.USERNAME_FIELD, username)
        except ValidationError:
            errors["username"] = ["Informe um nome de usuário válido."]

    if username is not None and User._default_manager.filter(
        **{User.USERNAME_FIELD: username}
    ).exists():
        errors["username"] = ["Este nome de usuário não está disponível."]

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
