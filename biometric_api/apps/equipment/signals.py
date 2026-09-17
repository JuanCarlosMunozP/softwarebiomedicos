from decimal import Decimal

from django.db.models.signals import post_delete, post_save, pre_delete
from django.dispatch import receiver
from django.db.models import Sum

from .models import Equipment, WorkOrderCost, WorkOrderSparePart
from .services import generate_qr_for_equipment


@receiver(post_save, sender=Equipment)
def auto_generate_qr(sender, instance: Equipment, created: bool, **kwargs) -> None:
    if created and not instance.qr_code:
        generate_qr_for_equipment(instance)


@receiver(pre_delete, sender=Equipment)
def remove_qr_file(sender, instance: Equipment, **kwargs) -> None:
    if instance.qr_code:
        instance.qr_code.delete(save=False)


def _sync_spare_parts_cost(work_order_id: int) -> None:
    """El costo de repuestos de la OT es la suma de las líneas, no un dato suelto."""
    total = WorkOrderSparePart.objects.filter(
        work_order_id=work_order_id
    ).aggregate(s=Sum("total_cost"))["s"] or Decimal("0.00")
    cost, _created = WorkOrderCost.objects.get_or_create(
        work_order_id=work_order_id
    )
    if cost.spare_parts_cost != total:
        cost.spare_parts_cost = total
        cost.save(update_fields=["spare_parts_cost"])


@receiver(post_save, sender=WorkOrderSparePart)
def update_cost_on_spare_part_save(sender, instance: WorkOrderSparePart, **kwargs) -> None:
    _sync_spare_parts_cost(instance.work_order_id)


@receiver(post_delete, sender=WorkOrderSparePart)
def update_cost_on_spare_part_delete(sender, instance: WorkOrderSparePart, **kwargs) -> None:
    _sync_spare_parts_cost(instance.work_order_id)
