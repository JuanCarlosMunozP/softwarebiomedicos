"""HTTP del catálogo de marcas y modelos (`/api/v1/catalog/`).

ViewSets de `Brand` y `EquipmentModel`. Las rutas viven bajo `/catalog/`
pero el permiso es el recurso `equipment` de ROLE_MATRIX (quien gestiona
inventario gestiona el catálogo). Coordinador puede crear y editar;
ingeniero, técnico y usuario consultan.

DELETE está protegido: no se borra una marca con modelos, ni un modelo
con equipos (ProtectedError → 409). `is_active` permite ocultar un
ítem del catálogo sin eliminarlo. La unicidad es marca + nombre de
modelo.
"""
