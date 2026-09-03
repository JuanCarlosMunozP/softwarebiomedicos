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

    def get_queryset(self):
        qs = super().get_queryset()
        # El técnico solo ve los mantenimientos que tiene asignados; el resto
        # de roles (gestión e ingeniería) ven todos.
        user = self.request.user
        if user.is_authenticated and user.role == User.Role.TECNICO:
            qs = qs.filter(assigned_technician=user)
        return qs
