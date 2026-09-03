from __future__ import annotations

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

from apps.realtime.events import broadcast_notification


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_schedule_notification(self, schedule_id: int) -> str:
    from .models import MaintenanceSchedule

    try:
        schedule = (
            MaintenanceSchedule.objects.select_related(
                "equipment", "equipment__branch"
            ).get(pk=schedule_id)
        )
    except MaintenanceSchedule.DoesNotExist:
        return "schedule_not_found"

    equipment = schedule.equipment
    branch = equipment.branch

    recipients = list(getattr(settings, "MAINTENANCE_NOTIFICATION_EMAILS", []) or [])
    if branch.email:
        recipients.append(branch.email)
    recipients = list({r for r in recipients if r})
    if not recipients:
        return "no_recipients"

    context = {
        "schedule": schedule,
        "equipment": equipment,
        "branch": branch,
    }
    fecha = (
        schedule.scheduled_date.isoformat()
        if schedule.scheduled_date
        else "sin programar"
    )
    subject = (
        f"[Biometric] Mantenimiento programado: {equipment.asset_tag} ({fecha})"
    )
    body_text = render_to_string("scheduling/email/schedule_notification.txt", context)
    body_html = render_to_string("scheduling/email/schedule_notification.html", context)

    message = EmailMultiAlternatives(
        subject=subject,
        body=body_text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
    )
    message.attach_alternative(body_html, "text/html")

    try:
        message.send(fail_silently=False)
    except Exception as exc:
        raise self.retry(exc=exc) from exc

    sent_at = timezone.now()
    schedule.notified_at = sent_at
    schedule.save(update_fields=["notified_at", "updated_at"])

    _broadcast_email_sent(schedule, equipment, branch, subject, sent_at)
    return "sent"


def _broadcast_email_sent(schedule, equipment, branch, subject, sent_at) -> None:
    """Empuja el evento al canal WS. No debe tumbar la tarea si Redis falla."""
    try:
        broadcast_notification(
            {
                "type": "schedule_email_sent",
                "schedule_id": schedule.pk,
                "equipment_asset_tag": equipment.asset_tag,
                "scheduled_date": (
                    schedule.scheduled_date.isoformat()
                    if schedule.scheduled_date
                    else ""
                ),
                "branch_name": branch.name,
                "subject": subject,
                "sent_at": sent_at.isoformat(),
            }
        )
    except Exception:  # pragma: no cover - best-effort
        pass
