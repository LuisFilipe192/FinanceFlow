import logging
import threading

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMessage
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

logger = logging.getLogger(__name__)


def build_reset_link(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    return f"{settings.FRONTEND_URL}/reset-password#uid={uid}&token={token}"


def build_reset_email(user):
    minutes = settings.PASSWORD_RESET_TIMEOUT // 60

    return EmailMessage(
        subject="Redefina sua senha do FinanceFlow",
        body=(
            f"Olá, {user.get_username()}.\n\n"
            "Recebemos um pedido para redefinir a senha da sua conta. "
            "Para escolher uma senha nova, abra este link:\n\n"
            f"{build_reset_link(user)}\n\n"
            f"O link vale por {minutes} minutos e só pode ser usado uma vez.\n\n"
            "Se não foi você, ignore este e-mail. Sua senha continua a mesma."
        ),
        to=[user.email],
    )


def build_password_changed_email(user):
    return EmailMessage(
        subject="Sua senha do FinanceFlow foi alterada",
        body=(
            f"Olá, {user.get_username()}.\n\n"
            "A senha da sua conta acabou de ser alterada, e as sessões abertas foram encerradas.\n\n"
            "Se foi você, não precisa fazer nada. Se não foi, peça uma nova "
            f"redefinição de senha agora mesmo em {settings.FRONTEND_URL}/forgot-password."
        ),
        to=[user.email],
    )


def _send(message):
    try:
        message.send()
    except Exception:
        logger.exception("Falha ao enviar e-mail de senha.")


def send_in_background(message):
    threading.Thread(target=_send, args=(message,), daemon=True).start()


def find_user_for_reset(email):
    User = get_user_model()

    return User._default_manager.filter(email__iexact=email, is_active=True).first()


def find_user_from_uid(uid):
    User = get_user_model()

    try:
        pk = force_str(urlsafe_base64_decode(uid))
        return User._default_manager.filter(pk=pk, is_active=True).first()
    except (TypeError, ValueError, OverflowError, UnicodeDecodeError):
        return None


def is_valid_reset_token(user, token):
    return user is not None and default_token_generator.check_token(user, token)
