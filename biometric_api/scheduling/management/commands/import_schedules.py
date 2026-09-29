"""Importa solicitudes de mantenimiento desde un CSV.

Uso (igual que import_equipment / import_users, incluido dentro de Docker):
    python manage.py import_schedules ruta/al/archivo.csv
    docker compose exec web python manage.py import_schedules ruta/al/archivo.csv

Cabeceras esperadas (el orden no importa, se leen por nombre):
    asset_tag, kind, requested_date   (obligatorias)
    requested_by, scheduled_date, notes, assigned_engineer,
    assigned_technician, is_completed   (opcionales)

- asset_tag identifica el equipo (Equipment.asset_tag). Si no existe, o si
  el equipo está INACTIVE, la fila se omite (igual que
  MaintenanceScheduleSerializer.validate_equipment) — este comando no crea
  equipos (eso es import_equipment).
- kind acepta el código del modelo (PREVENTIVE/REPAIR) o su etiqueta en
  español.
- requested_by / assigned_engineer / assigned_technician son el username
  correspondiente. Si el usuario no existe, o (para los asignados) no tiene
  el rol correcto (ingeniero/tecnico) o está inactivo, se deja sin asignar
  — igual que ya exige el serializer — no se rompe la fila completa por eso.
- No se importan `notified_at`, `auto_generated` ni `generated_from`: los
  gestiona el propio sistema (notificaciones, solicitudes generadas desde
  una falla), no tiene sentido traerlos de un CSV.
- El upsert es por (equipo, fecha de solicitud, tipo): re-ejecutar con un
  archivo más completo actualiza la solicitud existente sin duplicar. A
  diferencia de asset_tag/username, esto no es un identificador real del
  negocio (una solicitud no trae uno) — es la mejor aproximación
  disponible.
- --dry-run: procesa el archivo sin escribir en la base de datos.
"""

from __future__ import annotations

import csv
from datetime import date, datetime
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from equipment.models import Equipment, EquipmentStatus
from users.models import User

from ...models import MaintenanceSchedule, ScheduledMaintenanceKind

_KIND_MAP = {
    "PREVENTIVE": ScheduledMaintenanceKind.PREVENTIVE,
    "PREVENTIVO": ScheduledMaintenanceKind.PREVENTIVE,
    "MANTENIMIENTO PREVENTIVO": ScheduledMaintenanceKind.PREVENTIVE,
    "REPAIR": ScheduledMaintenanceKind.REPAIR,
    "REPARACION": ScheduledMaintenanceKind.REPAIR,
    "REPARACIÓN": ScheduledMaintenanceKind.REPAIR,
}

_TRUE_TOKENS = {"TRUE", "1", "SI", "SÍ", "YES", "CUMPLIDA", "CUMPLIDO", "COMPLETADA", "COMPLETADO"}

_DATE_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d")


def _clean(value: str | None) -> str:
    return (value or "").strip()


def _col(row: dict[str, str], *names: str) -> str:
    for name in names:
        if name in row and row[name] is not None:
            return row[name]
    return ""


def _kind(value: str | None) -> str | None:
    return _KIND_MAP.get(_clean(value).upper())


def _bool(value: str | None) -> bool:
    return _clean(value).upper() in _TRUE_TOKENS


def _parse_date(value: str | None) -> date | None:
    text = _clean(value)
    if not text:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


class Command(BaseCommand):
    help = "Importa solicitudes de mantenimiento desde un CSV."

    def add_arguments(self, parser) -> None:
        parser.add_argument("csv_path", type=str)
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Procesa el archivo sin escribir en la base de datos.",
        )

    def handle(self, *args, **options) -> None:
        path = Path(options["csv_path"])
        if not path.exists():
            raise CommandError(f"No existe el archivo: {path}")

        with path.open(encoding="utf-8-sig", newline="") as fh:
            rows = list(csv.DictReader(fh))

        if not rows:
            raise CommandError("El CSV no tiene filas.")

        created = updated = skipped = 0
        equipment_cache: dict[str, Equipment] = {}
        user_cache: dict[str, User | None] = {}

        def _resolve_equipment(asset_tag: str) -> Equipment | None:
            key = asset_tag.upper()
            if key not in equipment_cache:
                eq = Equipment.objects.filter(asset_tag__iexact=asset_tag).first()
                if eq is not None:
                    equipment_cache[key] = eq
                return eq
            return equipment_cache[key]

        def _resolve_user(username: str) -> User | None:
            if not username:
                return None
            if username not in user_cache:
                user_cache[username] = User.objects.filter(username=username).first()
            return user_cache[username]

        def _resolve_assignee(username: str, role: str, label: str, row_num: int) -> User | None:
            user = _resolve_user(username)
            if username and user is None:
                self.stderr.write(f"  fila {row_num}: {label} '{username}' no existe, sin asignar")
                return None
            if user is not None and (not user.is_active or user.role != role):
                self.stderr.write(
                    f"  fila {row_num}: {label} '{username}' no tiene rol/estado válido, sin asignar"
                )
                return None
            return user

        try:
            with transaction.atomic():
                for i, row in enumerate(rows, start=2):
                    row = {(k or "").strip(): v for k, v in row.items()}

                    asset_tag = _clean(_col(row, "asset_tag", "ASSET_TAG"))
                    kind = _kind(_col(row, "kind", "KIND", "TIPO"))
                    requested_date = _parse_date(
                        _col(row, "requested_date", "REQUESTED_DATE")
                    )

                    if not asset_tag or kind is None or requested_date is None:
                        self.stderr.write(
                            f"  fila {i}: faltan datos obligatorios "
                            "(asset_tag/kind/requested_date), omitida"
                        )
                        skipped += 1
                        continue

                    equipment = _resolve_equipment(asset_tag)
                    if equipment is None:
                        self.stderr.write(
                            f"  fila {i}: equipo '{asset_tag}' no encontrado, omitida"
                        )
                        skipped += 1
                        continue
                    if equipment.status == EquipmentStatus.INACTIVE:
                        self.stderr.write(
                            f"  fila {i}: equipo '{asset_tag}' está inactivo, omitida"
                        )
                        skipped += 1
                        continue

                    requested_by = _resolve_user(
                        _clean(_col(row, "requested_by", "REQUESTED_BY"))
                    )
                    engineer = _resolve_assignee(
                        _clean(_col(row, "assigned_engineer", "ASSIGNED_ENGINEER")),
                        User.Role.INGENIERO,
                        "ingeniero asignado",
                        i,
                    )
                    technician = _resolve_assignee(
                        _clean(_col(row, "assigned_technician", "ASSIGNED_TECHNICIAN")),
                        User.Role.TECNICO,
                        "técnico asignado",
                        i,
                    )

                    fields = {
                        "requested_by": requested_by,
                        "scheduled_date": _parse_date(
                            _col(row, "scheduled_date", "SCHEDULED_DATE")
                        ),
                        "notes": _clean(_col(row, "notes", "NOTES")),
                        "assigned_engineer": engineer,
                        "assigned_technician": technician,
                        "is_completed": _bool(
                            _col(row, "is_completed", "IS_COMPLETED", "ESTADO")
                        ),
                    }

                    # select_related(None): el manager por defecto trae
                    # assigned_engineer/assigned_technician/requested_by (FKs
                    # nulables), y update_or_create() activa
                    # select_for_update() dentro de una transacción —
                    # Postgres no permite FOR UPDATE sobre el lado nulable de
                    # un LEFT JOIN. Mismo caso ya resuelto así en
                    # MaintenanceRecordSerializer.create()/update() (que hace
                    # lo mismo sobre este mismo modelo).
                    _, was_created = (
                        MaintenanceSchedule.objects.select_related(None).update_or_create(
                            equipment=equipment,
                            requested_date=requested_date,
                            kind=kind,
                            defaults=fields,
                        )
                    )
                    if was_created:
                        created += 1
                    else:
                        updated += 1

                if options["dry_run"]:
                    self.stdout.write(self.style.WARNING("DRY-RUN: revirtiendo."))
                    transaction.set_rollback(True)
        except Exception as exc:  # noqa: BLE001
            raise CommandError(f"Import abortado: {exc}") from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"Creados: {created}  ·  Actualizados: {updated}  ·  Omitidos: {skipped}"
            )
        )
