"""Endpoint agregado para el dashboard de la SPA.

Una sola request, una sola response. Las queries se aíslan en funciones helper para
testearlas independientemente del view.
"""

from __future__ import annotations

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User
from apps.scheduling.tasks import queue_overdue_alerts

from .helpers import (
    _MAINTENANCE_KINDS,
    _area_ops_dashboard,
    _assignment_scope,
    _engineer_tasks_dashboard,
    _equipment_distribution,
    _equipment_kpis,
    _failures_distribution,
    _failures_kpis,
    _maintenance_cost_series,
    _maintenance_kpis,
    _maintenance_time_series,
    _my_schedules,
    _overdue_schedules,
    _schedule_series,
    _scheduling_kpis,
    _weekly_reports,
    _worst_mtbf,
)


class DashboardSummaryView(APIView):
    """Snapshot agregado para el dashboard. Sin cache en v1."""

    permission_classes = (IsAuthenticated,)

    def get(self, request):
        today = timezone.localdate()
        # Para el técnico, las métricas de trabajo se acotan a lo suyo.
        scope = _assignment_scope(request.user)
        payload = {
            "kpis": {
                "equipment": _equipment_kpis(),
                "failures": _failures_kpis(),
                "scheduling": _scheduling_kpis(today, scope),
                "maintenance": _maintenance_kpis(today, scope),
            },
            "distributions": {
                "equipment_by_status": _equipment_distribution(),
                "failures_by_severity": _failures_distribution(),
            },
            "time_series": {
                "maintenance_by_month": _maintenance_time_series(today, scope),
                "schedules": (
                    _schedule_series(today)
                    if getattr(request.user, "role", None)
                    in (User.Role.COORDINADOR, User.Role.SUPERADMIN)
                    else []
                ),
                "maintenance_costs": (
                    _maintenance_cost_series(today)
                    if getattr(request.user, "role", None)
                    in (User.Role.COORDINADOR, User.Role.SUPERADMIN)
                    else []
                ),
            },
            "lists": {
                "overdue_schedules": _overdue_schedules(today, scope),
                "worst_mtbf": _worst_mtbf(),
            },
            "my_tasks": {
                "schedules": _my_schedules(request.user, today),
                # FailureRecord no tiene "assigned_to" en v1; se reserva la key
                # para futuro sin obligar al frontend a defenderse contra ausencia.
                "failures": [],
            },
            "my_week": (
                _weekly_reports(request.user, today)
                if getattr(request.user, "role", None) == User.Role.TECNICO
                else None
            ),
            "area_ops": _area_ops_dashboard(request.user, today),
            "engineer_tasks": _engineer_tasks_dashboard(request.user),
        }
        if payload["kpis"]["scheduling"]["overdue"] > 0:
            try:
                queue_overdue_alerts.delay()
            except Exception:
                pass
        return Response(payload)


__all__ = ["DashboardSummaryView"]
# Re-export helpers privados para los tests.
_HELPERS = (
    _equipment_kpis,
    _failures_kpis,
    _scheduling_kpis,
    _maintenance_kpis,
    _equipment_distribution,
    _failures_distribution,
    _maintenance_time_series,
    _overdue_schedules,
    _worst_mtbf,
    _my_schedules,
    _MAINTENANCE_KINDS,
)
