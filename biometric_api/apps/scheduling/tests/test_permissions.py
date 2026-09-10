"""Espejo de ROLE_MATRIX / permissions.ts para el recurso `scheduling`."""
from datetime import date, timedelta

import pytest
from django.urls import reverse
from rest_framework import status

from apps.scheduling.models import ScheduledMaintenanceKind
from apps.users.tests.factories import IngenieroFactory, TecnicoFactory

from .factories import MaintenanceScheduleFactory

pytestmark = pytest.mark.django_db

LIST_URL = reverse("v1:scheduling:maintenance-list")


def detail_url(pk: int) -> str:
    return reverse("v1:scheduling:maintenance-detail", args=[pk])


def complete_url(pk: int) -> str:
    return reverse("v1:scheduling:maintenance-complete", args=[pk])


class TestSchedulingRolePermissions:
    def test_tecnico_cannot_create(self, api_client, equipment):
        api_client.force_authenticate(user=TecnicoFactory())
        resp = api_client.post(
            LIST_URL,
            {"equipment": equipment.id, "kind": ScheduledMaintenanceKind.PREVENTIVE},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_tecnico_cannot_edit_or_complete(self, api_client, tecnico, equipment):
        s = MaintenanceScheduleFactory(
            equipment=equipment, assigned_technician=tecnico
        )
        api_client.force_authenticate(user=tecnico)
        assert api_client.patch(
            detail_url(s.id), {"notes": "x"}, format="json"
        ).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.post(complete_url(s.id)).status_code == (
            status.HTTP_403_FORBIDDEN
        )

    def test_ingeniero_can_create_and_edit(self, api_client, equipment):
        api_client.force_authenticate(user=IngenieroFactory())
        created = api_client.post(
            LIST_URL,
            {
                "equipment": equipment.id,
                "kind": ScheduledMaintenanceKind.PREVENTIVE,
                "scheduled_date": (date.today() + timedelta(days=5)).isoformat(),
            },
            format="json",
        )
        assert created.status_code == status.HTTP_201_CREATED
        edited = api_client.patch(
            detail_url(created.json()["id"]), {"notes": "ok"}, format="json"
        )
        assert edited.status_code == status.HTTP_200_OK

    def test_ingeniero_cannot_delete(self, api_client, schedule):
        api_client.force_authenticate(user=IngenieroFactory())
        assert api_client.delete(detail_url(schedule.id)).status_code == (
            status.HTTP_403_FORBIDDEN
        )
