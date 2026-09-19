from django.utils.translation import gettext_lazy as _

from rest_framework.exceptions import PermissionDenied,ValidationError
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated


from api.v1.common.permissions import HasRolePermission
from api.v1.workorders.serializers import (
    WorkOrderMeasurementSerializer,
    WorkOrderEvidenceSerializer,
    WorkOrderCostSerializer,
    WorkOrderSignatureSerializer,
    WorkOrderSparePartSerializer
)
from apps.workorders.models import (
    WorkOrderCost,
    WorkOrderEvidence,
    WorkOrderMeasurement,
    WorkOrderSignature,
    WorkOrderSparePart
)
from apps.users.models import User
from apps.equipment.models import WorkOrderStatus

_FIELD_ROLES = (User.Role.TECNICO,User.Role.INGENIERO)

def _only_own_work_orders(user) -> bool:
    return bool(
        user and user.is_authenticated and getattr(user,"role",None) in _FIELD_ROLES
    )


class _WorkOrderChildScopedMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        if _only_own_work_orders(self.request.user):
            qs = qs.filter(work_order__technician=self.request.user)
        return qs

    def _ensure_work_order_open(self,work_order) -> None:
        if work_order is not None and work_order.status == WorkOrderStatus.FINISHED:
            raise ValidationError(
                {
                    "detail":_(
                        "La orden está terminada; el detalle es solo histórico."
                    )
                }
            )

    def perform_create(self,serializer):
        user = self.request.user 
        work_order = serializer.validated_data.get("work_order")
        if (
            _only_own_work_orders(user)
            and work_order is not None
            and work_order.technician_id != user.id
        ):
            raise PermissionDenied(
                _("Solo puedes editar los últimos elementos de tus propias órdenes de trabajo.")
            )
        self._ensure_work_order_open(work_order)
        serializer.save()

    def perform_update(self,serializer):
        self._ensure_work_order_open(serializer.instance.work_order)
        serializer.save()

    def perform_destroy(self,instance):
        self._ensure_work_order_open(instance.work_order)
        instance.delete()


class WorkOrderSparePartViewSet(_WorkOrderChildScopedMixin,viewsets.ModelViewSet):

    queryset = WorkOrderSparePart.objects.select_related(
        "work_order",
        "work_order__equipment",
    )

    serializer_class = WorkOrderSparePartSerializer
    permission_classes = (IsAuthenticated,HasRolePermission)
    permission_resource = "work_orders"

    filterset_fields = ("work_order",)
    search_fields = ("name","reference","work_order__number",)

    ordering_fields = ("name","quantity","unit_cost","total_cost")

    ordering = ("name",)


class WorkOrderMeasurementViewSet(_WorkOrderChildScopedMixin,viewsets.ModelViewSet):

    queryset = WorkOrderMeasurement.objects.select_related(
        "work_order",
        "work_order__equipment",
    )

    serializer_class = WorkOrderMeasurementSerializer
    permission_classes = (IsAuthenticated,HasRolePermission)
    permission_resource = "work_orders"

    filterset_fields = ("work_order","passed")
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


class WorkOrderEvidenceViewSet(_WorkOrderChildScopedMixin,viewsets.ModelViewSet):

    queryset = WorkOrderEvidence.objects.select_related(
        "work_order",
        "work_order__equipment",
    )

    serializer_class = WorkOrderEvidenceSerializer
    permission_classes = (IsAuthenticated, HasRolePermission)
    permission_resource = "work_orders"
    search_fields = (
        "description",
        "work_order__number",
    )

    ordering_fields = ("evidence_type","id")
    ordering = ("id",)


class WorkOrderSignatureViewSet(_WorkOrderChildScopedMixin,viewsets.ModelViewSet):
    queryset = WorkOrderSignature.objects.select_related(
        "work_order",
        "work_order__equipment",
    )

    serializer_class = WorkOrderSignatureSerializer
    permission_classes = (IsAuthenticated,HasRolePermission)
    permission_resource = "work_orders"

    filterset = ("work_order","role")
    search_fields = ("signed_by","role","work_order__number")
    ordering_fields = (
        "role",
        "signed_at",
    )

    ordering = ("-signed_at",)






class WorkOrderCostViewSet(_WorkOrderChildScopedMixin,viewsets.ModelViewSet):
    queryset = WorkOrderCost.objects.select_related(
        "work_order",
        "work_order__equipment",
    )

    serializer_class = WorkOrderCostSerializer
    permission_classes = (IsAuthenticated,HasRolePermission)
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
