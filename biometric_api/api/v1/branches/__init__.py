"""HTTP de sedes (`/api/v1/branches/`).

CRUD de `Branch` (nombre, dirección, ciudad, teléfono, email opcional,
activa/inactiva) con filters, serializers y urls. Superadmin y admin
tienen CRUD; coordinador e ingeniero solo lectura; técnico y usuario
no acceden al recurso.

Borrar una sede que todavía tiene equipos asociados falla con 409
porque `Equipment.branch` es PROTECT. El email vacío se normaliza a
NULL para que la unicidad opcional funcione en Postgres.
"""
