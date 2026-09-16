"""HTTP de reportes de falla (`/api/v1/failures/`).

CRUD de `FailureRecord` más la acción `resolve`, que llama
`mark_resolved()` (idempotente respecto de `resolved_at`). Campos:
equipo, descripción, severidad (Baja–Crítica), quién reportó, fechas
y notas de resolución.

Superadmin, admin, coordinador e ingeniero editan. El técnico tiene
view/create y solo sobre equipos de su área o reportes que él mismo
creó. Al guardar o borrar, las señales de `apps.failures` piden a
`apps.equipment.reliability` recalcular MTBF y MTTR del equipo.
"""
