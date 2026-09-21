from datetime import timedelta

import factory
from django.utils import timezone
from factory.django import DjangoModelFactory

from apps.equipment.tests.factories import EquipmentFactory
from apps.failures.models import FailureRecord, FailureSeverity


class FailureRecordFactory(DjangoModelFactory):
    class Meta:
        model = FailureRecord

    equipment = factory.SubFactory(EquipmentFactory)
    # Explícito (no el default=timezone.now del modelo): varios tests pasan
    # resolved_at=timezone.now() como argumento, que Python evalúa antes de
    # que factory_boy construya la instancia. Si reported_at tomara su
    # default del modelo (evaluado un instante después, al construir), por
    # una carrera de microsegundos podría quedar DESPUÉS de ese resolved_at y
    # violar la constraint de DB failure_resolved_at_after_reported_at. Unos
    # minutos atrás da margen de sobra sin afectar ningún test (el que le
    # importa el valor de reported_at ya lo sobrescribe explícitamente).
    reported_at = factory.LazyFunction(lambda: timezone.now() - timedelta(minutes=5))
    description = factory.Faker("sentence", nb_words=10)
    severity = FailureSeverity.MEDIUM
    resolved = False
    resolved_at = None
    resolution_notes = ""
