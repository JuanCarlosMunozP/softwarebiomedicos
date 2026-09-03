from django.utils.translation import gettext_lazy as _
from rest_framework.permissions import BasePermission

from apps.users.models import User

Role = User.Role

MANAGEMENT_ROLES = {Role.SUPERADMIN, Role.ADMIN, Role.COORDINADOR}

# Acciones abstractas
VIEW, CREATE, EDIT, DELETE = "view", "create", "edit", "delete"
_ALL = frozenset({VIEW, CREATE, EDIT, DELETE})

# Matriz rol × recurso × acciones permitidas.
#
# ESPEJO EXACTO de FrontEquiposBiometricos/src/lib/permissions.ts — si cambia
# uno, cambia el otro. El frontend solo esconde botones; la autorización real
# la impone `HasRolePermission` aquí. El recurso "users" tiene su propia lógica
# en api/v1/users/views.py (IsAdminRole + check_object_permissions) y NO pasa
# por esta matriz.
ROLE_MATRIX: dict[str, dict[str, frozenset[str]]] = {
    Role.SUPERADMIN: {
        "branches": _ALL,
        "equipment": _ALL,
        "maintenance": _ALL,
        "scheduling": _ALL,
        "failures": _ALL,
        "work_orders": _ALL,
    },
    Role.ADMIN: {
        "branches": _ALL,
        "equipment": _ALL,
        "maintenance": _ALL,
        "scheduling": _ALL,
        "failures": _ALL,
        "work_orders": _ALL,
    },
    Role.COORDINADOR: {
        "branches": frozenset({VIEW}),
        "equipment": frozenset({VIEW, CREATE, EDIT}),
        "maintenance": _ALL,
        "scheduling": _ALL,
        "failures": frozenset({VIEW, CREATE, EDIT}),
        "work_orders": _ALL,
    },
    Role.INGENIERO: {
        "branches": frozenset({VIEW}),
        "equipment": frozenset({VIEW}),
        "maintenance": frozenset({VIEW, CREATE, EDIT}),
        "scheduling": frozenset({VIEW, CREATE, EDIT}),
        "failures": frozenset({VIEW, CREATE, EDIT}),
        "work_orders": frozenset({VIEW, CREATE, EDIT}),
    },
    Role.TECNICO: {
        "equipment": frozenset({VIEW}),
        # EDIT para poder "realizar" un mantenimiento que le fue asignado
        # (registrar hallazgos, costo, PDF). El queryset lo limita a sus
        # propias asignaciones y el serializer bloquea reasignar/mover.
        "maintenance": frozenset({VIEW, CREATE, EDIT}),
        "scheduling": frozenset({VIEW}),
        "failures": frozenset({VIEW, CREATE}),
        # El técnico ejecuta la orden: la crea, la edita y le agrega
        # repuestos/mediciones/evidencias/firmas.
        "work_orders": frozenset({VIEW, CREATE, EDIT}),
    },
}

# Acción de DRF → acción abstracta.
_STANDARD_ACTIONS = {
    "list": VIEW,
    "retrieve": VIEW,
    "create": CREATE,
    "update": EDIT,
    "partial_update": EDIT,
    "destroy": DELETE,
}


def role_can(role: str | None, resource: str, action: str) -> bool:
    return action in ROLE_MATRIX.get(role or "", {}).get(resource, frozenset())


class HasRolePermission(BasePermission):
    """Autorización por rol × recurso × acción según ``ROLE_MATRIX``.

    El viewset declara ``permission_resource = "<recurso>"``. Las @action
    personalizadas cuentan como EDIT si mutan (POST/PUT/PATCH/DELETE) y como
    VIEW si son de solo lectura; se puede forzar VIEW listándolas en
    ``readonly_actions`` del viewset.
    """

    message = _("Tu rol no tiene permiso para realizar esta acción.")

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not (user and user.is_authenticated):
            return False

        resource = getattr(view, "permission_resource", None)
        if resource is None:
            # El viewset no optó por esta matriz (p. ej. users). No restringe.
            return True

        action = getattr(view, "action", None)
        needed = _STANDARD_ACTIONS.get(action)
        if needed is None:
            # @action custom o `metadata` (OPTIONS): read-only => VIEW, si no EDIT.
            readonly = request.method in ("GET", "HEAD", "OPTIONS") or (
                action in getattr(view, "readonly_actions", ())
            )
            needed = VIEW if readonly else EDIT

        return role_can(getattr(user, "role", None), resource, needed)
