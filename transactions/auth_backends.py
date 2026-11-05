from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class UsernameOrEmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        User = get_user_model()

        if username is None:
            username = kwargs.get(User.USERNAME_FIELD)

        if username is None or password is None:
            return None

        user = self._find_user(User, username)

        if user is None:
            User().set_password(password)
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None

    def _find_user(self, User, identifier):
        manager = User._default_manager
        user = manager.filter(**{User.USERNAME_FIELD: identifier}).first()

        if user is None and "@" in identifier:
            user = manager.filter(email__iexact=identifier).first()

        return user
