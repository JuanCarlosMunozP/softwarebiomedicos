import pytest
from django.urls import reverse
from rest_framework import status

from apps.audit.models import AuditLog
from apps.equipment.tests.factories import EquipmentFactory
from apps.maintenance.tests.factories import MaintenanceRecordFactory
from apps.users.tests.factories import TecnicoFactory

pytestmark = pytest.mark.django_db


def detail_url(record_id: int) -> str:
    return reverse("v1:maintenance:record-detail", args=[record_id])


class TestMaintenanceRealizarByAssignee:
    """El asignado puede 'realizar' su mantenimiento: registrar el trabajo,
    pero no reasignarlo ni moverlo de equipo."""

    def test_tecnico_can_register_work_on_own_maintenance(
        self, api_client, tecnico, equipment
    ):
        record = MaintenanceRecordFactory(
            equipment=equipment, assigned_technician=tecnico
        )
        api_client.force_authenticate(user=tecnico)

        response = api_client.patch(
            detail_url(record.id),
            {"observations": "Se cambió el fusible.", "cost": "25000.00"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        record.refresh_from_db()
        assert record.observations == "Se cambió el fusible."
        assert str(record.cost) == "25000.00"

    def test_tecnico_cannot_touch_maintenance_not_assigned(
        self, api_client, tecnico, equipment
    ):
        record = MaintenanceRecordFactory(
            equipment=equipment, assigned_technician=TecnicoFactory()
        )
        api_client.force_authenticate(user=tecnico)

        response = api_client.patch(
            detail_url(record.id), {"observations": "x"}, format="json"
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_tecnico_cannot_reassign_or_move_equipment(
        self, api_client, tecnico, equipment
    ):
        record = MaintenanceRecordFactory(
            equipment=equipment, assigned_technician=tecnico
        )
        otro_equipo = EquipmentFactory()
        otro_tec = TecnicoFactory()
        api_client.force_authenticate(user=tecnico)

        response = api_client.patch(
            detail_url(record.id),
            {
                "observations": "listo",
                "equipment": otro_equipo.id,
                "assigned_technician": otro_tec.id,
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        record.refresh_from_db()
        # Los campos sensibles se ignoran: el registro sigue siendo suyo.
        assert record.equipment_id == equipment.id
        assert record.assigned_technician_id == tecnico.id


class TestMaintenanceRecordDeletePermissions:
    def test_tecnico_cannot_delete(self, api_client, maintenance_record, tecnico):
        api_client.force_authenticate(user=tecnico)

        response = api_client.delete(detail_url(maintenance_record.id))

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_delete_leaves_audit_log(self, auth_client, maintenance_record, admin_user):
        record_id = maintenance_record.id

        response = auth_client.delete(detail_url(record_id))

        assert response.status_code == status.HTTP_204_NO_CONTENT
        log = AuditLog.objects.get(
            model_label="maintenance.maintenancerecord", object_id=str(record_id)
        )
        assert log.action == "delete"
        assert log.actor_id == admin_user.id
