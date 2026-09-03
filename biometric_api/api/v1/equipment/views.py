from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.v1.common.mixins import AuditLogMixin
from api.v1.common.permissions import HasRolePermission
from apps.equipment.models import (
    Equipment,
    EquipmentAttachment,
    EquipmentCertificate,
    EquipmentInstruction,
    EquipmentWorkOrder,
    WorkOrderCost,
    WorkOrderEvidence,
    WorkOrderMeasurement,
    WorkOrderSignature,
    WorkOrderSparePart,
)
from apps.equipment.services import generate_qr_for_equipment
from apps.users.models import User

from .filters import EquipmentFilter
from .serializers import (
    EquipmentAttachmentSerializer,
    EquipmentCertificateSerializer,
    EquipmentInstructionSerializer,
    EquipmentSerializer,
    EquipmentWorkOrderDetailSerializer,
    EquipmentWorkOrderSerializer,
    WorkOrderCostSerializer,
    WorkOrderEvidenceSerializer,
    WorkOrderMeasurementSerializer,
    WorkOrderSignatureSerializer,
    WorkOrderSparePartSerializer,
)

# Roles "de campo": ejecutan órdenes de trabajo, no las administran. Solo ven
# y editan las que tienen asignadas (technician == ellos).
_FIELD_ROLES = (User.Role.TECNICO, User.Role.INGENIERO)


def _only_own_work_orders(user) -> bool:
    return bool(
        user and user.is_authenticated and getattr(user, "role", None) in _FIELD_ROLES
    )


class EquipmentViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    CRUD de equipos biomédicos.

    Incluye:

    - CRUD
    - búsqueda por asset_tag
    - filtros
    - ordenamiento
    - regeneración de QR
    - historial de mantenimientos

    """

    queryset = Equipment.objects.select_related(
        "branch", "equipment_model", "equipment_model__brand"
    )
    serializer_class = EquipmentSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "equipment"
    filterset_class = EquipmentFilter
    search_fields = (
        "name",
        "asset_tag",
        "equipment_model__name",
        "equipment_model__brand__name",
    )
    ordering_fields = ("name", "purchase_date", "created_at")
    ordering = ("name",)

    @action(
        detail=False,
        methods=["get"],
        url_path=r"by-asset-tag/(?P<tag>[^/.]+)",
        url_name="by-asset-tag",
    )
    def by_asset_tag(self, request, tag: str = ""):
        """ Consulta un equipo utilizando su código de inventario."""
        equipment = get_object_or_404(Equipment, asset_tag__iexact=tag.strip())
        serializer = self.get_serializer(equipment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="regenerate-qr")
    def regenerate_qr(self, request, pk: int = None):
        """Regenera el código QR del equipo."""
        equipment = self.get_object()
        if equipment.qr_code:
            equipment.qr_code.delete(save=False)
        generate_qr_for_equipment(equipment)
        equipment.refresh_from_db()
        serializer = self.get_serializer(equipment)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="regenerate-qr-all")
    def regenerate_qr_all(self, request):
        """Regenera el código QR de todos los equipos.

        Útil tras cambiar FRONTEND_BASE_URL o al preparar una tanda de
        etiquetas para imprimir. Con ``?missing=1`` solo cubre los equipos
        que aún no tienen QR.
        """
        queryset = self.filter_queryset(self.get_queryset())
        missing = request.query_params.get("missing") in ("1", "true", "True")
        if missing:
            queryset = queryset.filter(qr_code="")

        count = 0
        for equipment in queryset.iterator():
            if equipment.qr_code:
                equipment.qr_code.delete(save=False)
            generate_qr_for_equipment(equipment)
            count += 1

        return Response({"regenerated": count}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk: int = None):
        """Historial paginado de mantenimientos del equipo."""
        # Imports locales para evitar cualquier riesgo de import circular:
        # apps.maintenance ya importa apps.equipment.models en su FK.
        from api.v1.maintenance.serializers import MaintenanceRecordSerializer
        from apps.maintenance.models import MaintenanceRecord

        equipment = self.get_object()
        queryset = MaintenanceRecord.objects.filter(equipment=equipment).order_by(
            "-date", "-created_at"
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = MaintenanceRecordSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)
        serializer = MaintenanceRecordSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)

class EquipmentAttachmentViewSet(viewsets.ModelViewSet):

    """CRUD de archivos adjuntos de equipos."""

    queryset = EquipmentAttachment.objects.select_related(
        "equipment",
        "uploaded_by",
    )

    serializer_class = EquipmentAttachmentSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "equipment"

    search_fields = ("title","equipment__name","equipment__asset_tag")

    ordering_fields = ("title","uploaded_at",)

    ordering = ("-uploaded_at",)

    def perform_create(self, serializer):
        # `uploaded_by` es read-only en el serializer justamente para que no
        # se pueda setear desde el request; se fija acá al usuario real.
        serializer.save(uploaded_by=self.request.user)

class EquipmentCertificateViewSet(viewsets.ModelViewSet):

    "CRUD de certificados de equipos"

    queryset = EquipmentCertificate.objects.select_related(
        "equipment",
    )

    serializer_class = EquipmentCertificateSerializer

    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "equipment"

    search_fields = (
        "certificate_number",
        "responsible",
        "equipment__name",
        "equipment__asset_tag",
    )

    ordering_fields = (
        "certificate_date",
        "created_at",
    )

    ordering = ("-certificate_date",)

class EquipmentInstructionViewSet(viewsets.ModelViewSet):

    "CRUD de instrucciones de equipos"

    queryset = EquipmentInstruction.objects.select_related(
        "equipment",
    )

    serializer_class = EquipmentInstructionSerializer

    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "equipment"

    search_fields = (
        "activity",
        "equipment__name",
        "equipment__asset_tag",
    )

    ordering_fields = (
        "instruction_type",
        "sequence",
    )

    ordering = ("instruction_type","sequence",)


class EquipmentWorkOrderViewSet(AuditLogMixin, viewsets.ModelViewSet):

    "CRUD de órdenes de trabajo de equipos"

    queryset = EquipmentWorkOrder.objects.select_related(
        "equipment",
        "technician",
    )

    serializer_class = EquipmentWorkOrderSerializer

    def get_serializer_class(self):
        if self.action == "details":
            return EquipmentWorkOrderDetailSerializer
        return EquipmentWorkOrderSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "work_orders"

    def get_queryset(self):
        qs = super().get_queryset()
        if _only_own_work_orders(self.request.user):
            qs = qs.filter(technician=self.request.user)
        return qs

    def perform_create(self, serializer):
        # Un técnico/ingeniero que crea una orden sin indicar responsable queda
        # asignado a sí mismo (si no, no la vería: su lista está filtrada a las
        # suyas).
        user = self.request.user
        if _only_own_work_orders(user) and not serializer.validated_data.get(
            "technician"
        ):
            serializer.save(technician=user)
        else:
            serializer.save()

    filterset_fields = ("equipment", "status", "service_type", "technician")
    search_fields = (
        "number",
        "description",
        "equipment__name",
        "equipment__asset_tag",
        "technician__username",
        "technician__first_name",
        "technician__last_name",
    )

    ordering_fields = ("number", "start_date", "end_date", "status", "created_at")
    ordering = ("-start_date",)

    @action(detail=True, methods=["get"], url_path="details")
    def details(self, request, pk: int = None):
        """Devuelve una orden de trabajo junto a sus elementos relacionados."""
        work_order = get_object_or_404(
            self.get_queryset()
            .prefetch_related(
                "spare_parts", "measurements", "evidences", "signatures"
            )
            .select_related("cost"),
            pk=self.kwargs["pk"],
        )
        self.check_object_permissions(request, work_order)
        return Response(self.get_serializer(work_order).data)


class _WorkOrderChildScopedMixin:
    """Los roles de campo solo ven y editan los elementos (repuestos,
    mediciones, evidencias, firmas, costos) de sus propias órdenes de
    trabajo."""

    def get_queryset(self):
        qs = super().get_queryset()
        if _only_own_work_orders(self.request.user):
            qs = qs.filter(work_order__technician=self.request.user)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        work_order = serializer.validated_data.get("work_order")
        if (
            _only_own_work_orders(user)
            and work_order is not None
            and work_order.technician_id != user.id
        ):
            raise PermissionDenied(
                _("Solo puedes editar los elementos de tus propias órdenes de trabajo.")
            )
        serializer.save()


class WorkOrderSparePartViewSet(_WorkOrderChildScopedMixin, viewsets.ModelViewSet):

    """ CRUD de repuestos utilizados en una orden de trabajo."""

    queryset = WorkOrderSparePart.objects.select_related(
                "work_order",
                "work_order__equipment",
            )

    serializer_class = WorkOrderSparePartSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "work_orders"

    filterset_fields = ("work_order",)
    search_fields = ("name","reference","work_order__number")

    ordering_fields = ("name","quantity","unit_cost","total_cost")

    ordering = ("name",)


class WorkOrderMeasurementViewSet(_WorkOrderChildScopedMixin, viewsets.ModelViewSet):

    "CRUD de mediciones realizadas durante una orden de trabajo"

    queryset = WorkOrderMeasurement.objects.select_related(
        "work_order",
        "work_order__equipment",
    )

    serializer_class = WorkOrderMeasurementSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "work_orders"

    filterset_fields = ("work_order", "passed")
    search_fields = (
        "parameter",
        "measured_value",
        "expected_value",
        "unit",
        "work_order__number",
    )

    ordering_fields = (
        "parameter",
        "passed",
    )

    ordering = ("parameter",)


class WorkOrderEvidenceViewSet(_WorkOrderChildScopedMixin, viewsets.ModelViewSet):

    """CRUD de evidencias de una orden de trabajo."""

    queryset = WorkOrderEvidence.objects.select_related(
        "work_order",
        "work_order__equipment",
    )

    serializer_class = WorkOrderEvidenceSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "work_orders"

    filterset_fields = ("work_order", "evidence_type")
    search_fields = (
        "description",
        "work_order__number",
    )

    ordering_fields = ("evidence_type", "id")
    ordering = ("id",)


class WorkOrderSignatureViewSet(_WorkOrderChildScopedMixin, viewsets.ModelViewSet):

    """CRUD de firmas de una orden de trabajo."""

    queryset = WorkOrderSignature.objects.select_related(
        "work_order",
        "work_order__equipment",
    )

    serializer_class = WorkOrderSignatureSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "work_orders"

    filterset_fields = ("work_order", "role")
    search_fields = ("signed_by","role","work_order__number")
    ordering_fields = (
        "role",
        "signed_at",
    )

    ordering = ("-signed_at",)

class WorkOrderCostViewSet(_WorkOrderChildScopedMixin, viewsets.ModelViewSet):

    """

    CRUD de costos asociados a una orden de trabajo.

    Cada orden puede tener un único registro de costos.
    """

    queryset = WorkOrderCost.objects.select_related(
        "work_order",
        "work_order__equipment",
    )

    serializer_class = WorkOrderCostSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "work_orders"

    filterset_fields = ("work_order",)
    search_fields = (
        "work_order__number",
        "work_order__equipment__name",
    )

    ordering_fields = (
        "labor_cost",
        "spare_parts_cost",
        "transport_cost",
        "other_cost",
    )

    ordering = ("work_order",)
