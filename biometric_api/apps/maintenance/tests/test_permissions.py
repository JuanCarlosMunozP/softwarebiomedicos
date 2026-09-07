import pytest
from django.urls import reverse
from rest_framework import status

from apps.audit.models import AuditLog

pytestmark = pytest.mark.django_db

LIST_URL = reverse("v1:maintenance:record-list")


def detail_url(record_id: int) -> str:
    return reverse("v1:maintenance:record-detail", args=[record_id])


def _payload(equipment):
    return {
        "equipment": equipment.id,
        "kind": "PREVENTIVE",
        "date": "2026-01-15",
        "description": "Mantenimiento de prueba.",
    }


class TestMaintenanceRecordDeletePermissions:
    def test_tecnico_cannot_delete(self, api_client, maintenance_record, tecnico):
        api_client.force_authenticate(user=tecnico)

        response = api_client.delete(detail_url(maintenance_record.id))

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_superadmin_delete_leaves_audit_log(
        self, auth_client, maintenance_record, superadmin_user
    ):
        record_id = maintenance_record.id

        response = auth_client.delete(detail_url(record_id))

        assert response.status_code == status.HTTP_204_NO_CONTENT
        log = AuditLog.objects.get(
            model_label="maintenance.maintenancerecord", object_id=str(record_id)
        )
        assert log.action == "delete"
        assert log.actor_id == superadmin_user.id


class TestMaintenanceRecordWriteIsSuperadminOnly:
    """Registrar / editar / borrar en el historial de mantenimientos es
    exclusivo del superadmin (espejo de ROLE_MATRIX / permissions.ts)."""

    def test_admin_can_view_but_not_create(
        self, api_client, admin_user, equipment, maintenance_record
    ):
        api_client.force_authenticate(user=admin_user)
        assert api_client.get(LIST_URL).status_code == status.HTTP_200_OK
        assert api_client.post(
            LIST_URL, _payload(equipment), format="json"
        ).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.patch(
            detail_url(maintenance_record.id), {"description": "x"}, format="json"
        ).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.delete(
            detail_url(maintenance_record.id)
        ).status_code == status.HTTP_403_FORBIDDEN

    def test_coordinador_can_view_but_not_create(
        self, api_client, coordinador_user, equipment
    ):
        api_client.force_authenticate(user=coordinador_user)
        assert api_client.get(LIST_URL).status_code == status.HTTP_200_OK
        assert api_client.post(
            LIST_URL, _payload(equipment), format="json"
        ).status_code == status.HTTP_403_FORBIDDEN

    def test_tecnico_can_view_but_not_create(self, api_client, tecnico, equipment):
        api_client.force_authenticate(user=tecnico)
        assert api_client.get(LIST_URL).status_code == status.HTTP_200_OK
        assert api_client.post(
            LIST_URL, _payload(equipment), format="json"
        ).status_code == status.HTTP_403_FORBIDDEN

    def test_ingeniero_has_no_maintenance_access_at_all(
        self, api_client, ingeniero, equipment, maintenance_record
    ):
        api_client.force_authenticate(user=ingeniero)
        assert api_client.get(LIST_URL).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.post(
            LIST_URL, _payload(equipment), format="json"
        ).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.get(
            detail_url(maintenance_record.id)
        ).status_code == status.HTTP_403_FORBIDDEN
