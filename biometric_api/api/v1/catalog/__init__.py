"""HTTP del catálogo de marcas (Brand) y modelos (EquipmentModel).

Las rutas viven bajo /catalog/ pero el permiso es el recurso equipment.
DELETE está protegido si hay modelos o equipos que dependen del registro.
Coordinador puede crear/editar; ingeniero, técnico y usuario consultan.
"""
