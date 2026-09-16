"""Historial de mantenimientos ya ejecutados (MaintenanceRecord).

Tipos preventivo/correctivo/reparación/calibración/inspección, fecha,
descripción, observations, responsables, costo, PDF. OneToOne opcional
a la solicitud cumplida. Señales: registro con responsable (sin solicitud)
crea OT; OT terminada actualiza fecha/costo o genera el registro; borrar
el registro reabre la solicitud y quita el PDF del storage.
"""
