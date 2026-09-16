"""HTTP del historial de mantenimientos realizados (`/api/v1/maintenance/`).

CRUD de `MaintenanceRecord`: el registro ya cerrado (tipo, fecha,
descripción, observaciones, responsables, costo, PDF opcional), no la
ejecución en curso de una orden de trabajo.

ROLE_MATRIX recurso `maintenance`: solo superadmin muta
(create/edit/delete); admin y coordinador tienen VIEW. Ingeniero,
técnico y usuario no tienen el recurso en la matriz. El queryset, por
si acaso, recorta técnico/ingeniero a lo asignado a ellos y excluye
registros cuya OT sigue PENDING, IN_PROGRESS o CANCELLED (eso se
consulta en órdenes de trabajo). Gestión ve todos los registros,
incluidos los aún ligados a una OT abierta.
"""
