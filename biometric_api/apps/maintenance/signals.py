from datetime import datetime, time

from django.db import transaction
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.utils import timezone

from apps.equipment.models import EquipmentWorkOrder

from .models import MaintenanceKind, MaintenanceRecord

# MaintenanceRecord.kind -> EquipmentWorkOrder.service_type
_WO_SERVICE_TYPE = {
    MaintenanceKind.PREVENTIVE: "PREVENTIVE",
    MaintenanceKind.CORRECTIVE: "CORRECTIVE",
    MaintenanceKind.REPAIR: "CORRECTIVE",
    MaintenanceKind.CALIBRATION: "CALIBRATION",
    MaintenanceKind.INSPECTION: "INSPECTION",
}
_OPEN_STATUSES = ("PENDING", "IN_PROGRESS")


def _unique_wo_number(record: MaintenanceRecord) -> str:
    base = f"OT-{timezone.localdate():%Y%m%d}-M{record.pk}"
    number, i = base, 2
    while EquipmentWorkOrder.objects.filter(number=number).exists():
        number = f"{base}-{i}"
        i += 1
    return number


@receiver(post_save, sender=MaintenanceRecord)
def sync_work_order_from_record(sender, instance: MaintenanceRecord, **kwargs):
    """Si la gestión registra un mantenimiento con responsable (y no viene de
    una solicitud), se crea sola su orden de trabajo para que el técnico/
    ingeniero la ejecute desde "Órdenes de trabajo".
    """
    if instance.scheduled_maintenance_id:
        return  # ese caso lo cubre la señal de la solicitud

    assignee = instance.assigned_technician or instance.assigned_engineer
    if assignee is None:
        return

    existing = EquipmentWorkOrder.objects.filter(maintenance_record=instance).first()
    if existing is not None:
        if (
            existing.technician_id != assignee.id
            and existing.status in _OPEN_STATUSES
        ):
            existing.technician = assignee
            existing.save(update_fields=["technician"])
        return

    start = instance.date or timezone.localdate()
    EquipmentWorkOrder.objects.create(
        equipment=instance.equipment,
        number=_unique_wo_number(instance),
        service_type=_WO_SERVICE_TYPE.get(instance.kind, "CORRECTIVE"),
        start_date=timezone.make_aware(datetime.combine(start, time(8, 0))),
        description=instance.description,
        technician=assignee,
        status="PENDING",
        maintenance_record=instance,
    )


@receiver(pre_delete, sender=MaintenanceRecord)
def remove_pdf_file(sender, instance: MaintenanceRecord, **kwargs) -> None:
    """Borra el PDF asociado del storage al eliminar el registro."""
    if instance.pdf_file:
        pdf_file = instance.pdf_file
        transaction.on_commit(lambda:pdf_file.delete(save=False))

@receiver(pre_delete,sender=MaintenanceRecord)
def reopen_linked_schedule(sender,instance:MaintenanceRecord,**kwargs) -> None:
    """Si el registro estaba vinculado a un agendamiento, lo reabre al borrarse."""
    schedule = instance.scheduled_maintenance
    if schedule is not None and schedule.is_completed:
        schedule.is_completed = False
        schedule.save(update_fields=["is_completed","updated_at"])
        return "Registro abierto correctamente"
