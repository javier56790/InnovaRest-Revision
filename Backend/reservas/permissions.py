from rest_framework.permissions import BasePermission

from .models import Usuario


class RolePermission(BasePermission):
    allowed_roles = ()

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.rol in self.allowed_roles
        )


class IsCliente(RolePermission):
    allowed_roles = (Usuario.Rol.CLIENTE,)


class IsRestaurante(RolePermission):
    allowed_roles = (Usuario.Rol.RESTAURANTE,)


class IsSuperadmin(RolePermission):
    allowed_roles = (Usuario.Rol.SUPERADMIN,)
