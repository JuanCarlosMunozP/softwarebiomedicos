from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.equipment.models import EquipmentWorkOrder
from apps.users.tests.factories import IngenieroFactory, TecnicoFactory

pytestmark = pytest.mark.django_db

WO_LIST = reverse("v1:equipment:equipment-work-order-list")
SP_LIST = reverse("v1:equipment:work-order-spare-part-list")
MS_LIST = reverse("v1:equipment:work-order-measurement-list")
EV_LIST = reverse("v1:equipment:work-order-evidence-list")
SG_LIST = reverse("v1:equipment:work-order-signature-list")
CO_LIST = reverse("v1:equipment:work-order-cost-list")


def wo_detail(pk):
    return reverse("v1:equipment:equipment-work-order-detail", args=[pk])


def wo_details_action(pk):
    return reverse("v1:equipment:equipment-work-order-details", args=[pk])


def _wo_payload(equipment, **overrides):
    data = {
        "equipment": equipment.id,
        "number": "OT-0001",
        "service_type": "PREVENTIVE",
        "start_date": timezone.now().isoformat(),
        "description": "Mantenimiento preventivo trimestral.",
        "status": "PENDING",
    }
    data.update(overrides)
    return data


class TestWorkOrderCrud:
    def test_create_and_list(self, auth_client, equipment):
        resp = auth_client.post(WO_LIST, _wo_payload(equipment), format="json")
        assert resp.status_code == 201, resp.json()
        body = resp.json()
        assert body["equipment_asset_tag"] == equipment.asset_tag
        assert body["service_type_display"] == "Preventivo"
        assert body["status_display"] == "Pendiente"
        assert auth_client.get(WO_LIST).json()["count"] == 1

    def test_duplicate_number_returns_400(self, auth_client, equipment):
        auth_client.post(WO_LIST, _wo_payload(equipment), format="json")
        resp = auth_client.post(WO_LIST, _wo_payload(equipment), format="json")
        assert resp.status_code == 400
        assert "Ya existe una orden" in resp.json()["number"][0]

    def test_end_before_start_returns_400(self, auth_client, equipment):
        now = timezone.now()
        resp = auth_client.post(
            WO_LIST,
            _wo_payload(
                equipment,
                start_date=now.isoformat(),
                end_date=(now - timedelta(hours=2)).isoformat(),
            ),
            format="json",
        )
        assert resp.status_code == 400
        assert "end_date" in resp.json()

    def test_filter_by_equipment_and_status(self, auth_client, equipment, branch):
        from apps.equipment.tests.factories import EquipmentFactory

        other = EquipmentFactory(branch=branch)
        auth_client.post(WO_LIST, _wo_payload(equipment, number="A-1"), format="json")
        auth_client.post(
            WO_LIST,
            _wo_payload(equipment, number="A-2", status="FINISHED"),
            format="json",
        )
        auth_client.post(WO_LIST, _wo_payload(other, number="B-1"), format="json")

        assert auth_client.get(WO_LIST, {"equipment": equipment.id}).json()["count"] == 2
        assert auth_client.get(WO_LIST, {"status": "FINISHED"}).json()["count"] == 1


class TestWorkOrderChildren:
    @pytest.fixture
    def wo(self, auth_client, equipment):
        return EquipmentWorkOrder.objects.create(
            equipment=equipment,
            number="OT-CHILD",
            service_type="CORRECTIVE",
            start_date=timezone.now(),
            description="x",
        )

    def test_spare_part_total_cost_is_computed(self, auth_client, wo):
        resp = auth_client.post(
            SP_LIST,
            {
                "work_order": wo.id,
                "name": "Fusible",
                "reference": "F-2A",
                "quantity": 3,
                "unit_cost": "1500.00",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["total_cost"] == "4500.00"

    def test_details_action_nests_children(self, auth_client, wo):
        auth_client.post(
            SP_LIST,
            {"work_order": wo.id, "name": "P", "reference": "R", "quantity": 1,
             "unit_cost": "10.00"},
            format="json",
        )
        auth_client.post(
            MS_LIST,
            {"work_order": wo.id, "parameter": "Temperatura", "expected_value": "37",
             "measured_value": "37.1", "unit": "C", "passed": True},
            format="json",
        )
        auth_client.post(
            SG_LIST,
            {"work_order": wo.id, "role": "TECHNICIAN", "signed_by": "Juan P."},
            format="json",
        )
        auth_client.post(
            CO_LIST,
            {"work_order": wo.id, "labor_cost": "50000", "spare_parts_cost": "10"},
            format="json",
        )

        body = auth_client.get(wo_details_action(wo.id)).json()
        assert len(body["spare_parts"]) == 1
        assert len(body["measurements"]) == 1
        assert len(body["signatures"]) == 1
        assert body["cost"]["labor_cost"] == "50000.00"
        assert body["evidences"] == []

    def test_filter_children_by_work_order(self, auth_client, wo, equipment):
        other = EquipmentWorkOrder.objects.create(
            equipment=equipment, number="OT-OTHER", service_type="PREVENTIVE",
            start_date=timezone.now(), description="y",
        )
        auth_client.post(
            MS_LIST,
            {"work_order": wo.id, "parameter": "P1", "expected_value": "1",
             "measured_value": "1", "unit": "u", "passed": True},
            format="json",
        )
        auth_client.post(
            MS_LIST,
            {"work_order": other.id, "parameter": "P2", "expected_value": "2",
             "measured_value": "2", "unit": "u", "passed": True},
            format="json",
        )
        assert auth_client.get(MS_LIST, {"work_order": wo.id}).json()["count"] == 1


class TestWorkOrderPermissions:
    def test_tecnico_can_create_and_edit(self, api_client, equipment):
        api_client.force_authenticate(user=TecnicoFactory())
        created = api_client.post(WO_LIST, _wo_payload(equipment), format="json")
        assert created.status_code == 201
        patched = api_client.patch(
            wo_detail(created.json()["id"]), {"status": "IN_PROGRESS"}, format="json"
        )
        assert patched.status_code == 200

    def test_tecnico_cannot_delete(self, api_client, equipment):
        wo = EquipmentWorkOrder.objects.create(
            equipment=equipment, number="OT-DEL", service_type="PREVENTIVE",
            start_date=timezone.now(), description="z",
        )
        api_client.force_authenticate(user=TecnicoFactory())
        assert api_client.delete(wo_detail(wo.id)).status_code == (
            status.HTTP_403_FORBIDDEN
        )


class TestWorkOrderScopedByRole:
    """Técnico e ingeniero solo ven/editan las órdenes que tienen asignadas."""

    def _wo(self, equipment, number, technician=None):
        return EquipmentWorkOrder.objects.create(
            equipment=equipment,
            number=number,
            service_type="PREVENTIVE",
            start_date=timezone.now(),
            description="x",
            technician=technician,
        )

    def test_field_role_only_sees_own_orders(self, api_client, equipment):
        ing = IngenieroFactory()
        self._wo(equipment, "OT-MIA", technician=ing)
        self._wo(equipment, "OT-AJENA", technician=TecnicoFactory())
        self._wo(equipment, "OT-SIN")

        api_client.force_authenticate(user=ing)
        assert api_client.get(WO_LIST).json()["count"] == 1

    def test_management_sees_all_orders(self, auth_client, equipment):
        self._wo(equipment, "OT-A", technician=TecnicoFactory())
        self._wo(equipment, "OT-B")

        assert auth_client.get(WO_LIST).json()["count"] == 2

    def test_field_role_created_order_is_self_assigned(self, api_client, equipment):
        tec = TecnicoFactory()
        api_client.force_authenticate(user=tec)

        created = api_client.post(
            WO_LIST, _wo_payload(equipment, number="OT-AUTO"), format="json"
        )

        assert created.status_code == 201
        assert created.json()["technician"] == tec.id
        assert api_client.get(WO_LIST).json()["count"] == 1

    def test_field_role_cannot_touch_others_order(self, api_client, equipment):
        wo = self._wo(equipment, "OT-OTRO", technician=TecnicoFactory())
        api_client.force_authenticate(user=IngenieroFactory())

        # No la ve...
        assert api_client.get(wo_detail(wo.id)).status_code == 404
        # ...ni puede colgarle un repuesto.
        resp = api_client.post(
            SP_LIST,
            {
                "work_order": wo.id,
                "name": "Fusible",
                "reference": "F-1",
                "quantity": 1,
                "unit_cost": "1000.00",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_field_role_can_work_on_own_order_children(self, api_client, equipment):
        tec = TecnicoFactory()
        wo = self._wo(equipment, "OT-PROPIA", technician=tec)
        api_client.force_authenticate(user=tec)

        resp = api_client.post(
            SP_LIST,
            {
                "work_order": wo.id,
                "name": "Empaque",
                "reference": "E-9",
                "quantity": 2,
                "unit_cost": "5000.00",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert api_client.get(SP_LIST, {"work_order": wo.id}).json()["count"] == 1
