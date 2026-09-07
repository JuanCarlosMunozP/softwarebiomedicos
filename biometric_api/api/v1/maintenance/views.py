from rest_framework import viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

from api.v1.common.mixins import AuditLogMixin
from api.v1.common.permissions import HasRolePermission
from apps.maintenance.models import MaintenanceRecord
from apps.users.models import User

from .filters import MaintenanceRecordFilter
from .serializers import MaintenanceRecordSerializer


class MaintenanceRecordViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """CRUD de registros históricos de mantenimiento, con upload de PDF opcional."""

    queryset = MaintenanceRecord.objects.all()
    serializer_class = MaintenanceRecordSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "maintenance"
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    filterset_class = MaintenanceRecordFilter
    search_fields = (
        "description",
        "observations",
        "technician",
        "equipment__asset_tag",
        "assigned_engineer__username",
        "assigned_engineer__first_name",
        "assigned_engineer__last_name",
        "assigned_technician__username",
        "assigned_technician__first_name",
        "assigned_technician__last_name",
    )
    ordering_fields = ("date", "created_at", "cost")
    ordering = ("-date",)

    # Órdenes de trabajo que significan "aún es una tarea, no un mantenimiento
    # del historial". El registro reaparece cuando la orden queda Terminada.
    _OPEN_WO_STATUSES = ("PENDING", "IN_PROGRESS", "CANCELLED")

    def get_queryset(self):
        qs = super().get_queryset()
        # El técnico solo ve los mantenimientos que tiene asignados, y de esos,
        # solo los ya realizados: si el registro tiene una orden de trabajo
        # abierta todavía es una tarea (vive en "Órdenes de trabajo"). Gestión
        # (superadmin/admin/coordinador) ve todos, incluidos los que están en
        # curso. El ingeniero no entra a este recurso (ver ROLE_MATRIX).
        user = self.request.user
        if not user.is_authenticated:
            return qs
        if user.role == User.Role.TECNICO:
            return qs.filter(assigned_technician=user).exclude(
                work_order__status__in=self._OPEN_WO_STATUSES
            )
        return qs
