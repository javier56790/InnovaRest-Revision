import secrets

from django.conf import settings
from django.core import signing
from django.utils.crypto import salted_hmac
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from .models import Usuario


TOKEN_SALT = "innovarest.auth.access"


def _password_marker(usuario: Usuario) -> str:
    return salted_hmac(
        "innovarest.auth.password",
        usuario.password,
    ).hexdigest()


def crear_token_acceso(usuario: Usuario) -> str:
    return signing.dumps(
        {
            "userId": usuario.id,
            "passwordMarker": _password_marker(usuario),
        },
        salt=TOKEN_SALT,
        compress=True,
    )


class SignedBearerAuthentication(BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        header = get_authorization_header(request).split()

        if not header:
            return None

        if header[0].decode("ascii", errors="ignore").lower() != "bearer":
            return None

        if len(header) != 2:
            raise AuthenticationFailed("El encabezado Bearer no es válido.")

        try:
            token = header[1].decode("ascii")
            payload = signing.loads(
                token,
                salt=TOKEN_SALT,
                max_age=settings.INNOVAREST_ACCESS_TOKEN_MAX_AGE,
            )
        except (UnicodeDecodeError, signing.BadSignature, signing.SignatureExpired):
            raise AuthenticationFailed("El token es inválido o ha vencido.")

        usuario = Usuario.objects.filter(
            pk=payload.get("userId"),
            estado=Usuario.Estado.ACTIVO,
        ).first()
        if usuario is None:
            raise AuthenticationFailed("El usuario no está activo.")

        marcador_recibido = payload.get("passwordMarker", "")
        if not secrets.compare_digest(
            marcador_recibido,
            _password_marker(usuario),
        ):
            raise AuthenticationFailed("El token dejó de ser válido.")

        return usuario, token

    def authenticate_header(self, request):
        return self.keyword
