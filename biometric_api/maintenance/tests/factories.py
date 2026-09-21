from datetime import date

import factory
from factory.django import DjangoModelFactory

from equipment.tests.factories import EquipmentFactory
from maintenance.models import MaintenanceKind, MaintenanceRecord


class MaintenanceRecordFactory(DjangoModelFactory):
    class Meta:
        model = MaintenanceRecord

    equipment = factory.SubFactory(EquipmentFactory)
    kind = MaintenanceKind.PREVENTIVE
    date = factory.LazyFunction(lambda: date(2026, 1, 15))
    description = factory.Faker("sentence", nb_words=10)
    technician = factory.Sequence(lambda n: f"Técnico {n}")
    cost = factory.Sequence(lambda n: 100000 + n * 1000)
