"""HTTP de sedes (Branch).

CRUD de sucursales con filters, serializers, urls y views.
Superadmin y admin tienen CRUD; coordinador e ingeniero solo lectura;
técnico y usuario no acceden. Borrar una sede con equipos asociados
devuelve 409 (ProtectedError).
"""
