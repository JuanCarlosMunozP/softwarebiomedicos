"""HTTP de equipos y órdenes de trabajo.

EquipmentViewSet: inventario, QR, adjuntos, certificados, instrucciones
e historial de mantenimientos ya realizados. El rol tecnico solo ve
equipos de su área. Técnico e ingeniero
solo operan las OT asignadas a ellos. complete exige observations; el
ingeniero no puede pasar a FINISHED sin haber estado IN_PROGRESS.
Permiso work_orders en ROLE_MATRIX (el tecnico no tiene work_orders).
"""
