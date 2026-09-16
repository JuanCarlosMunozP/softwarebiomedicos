"""Solicitudes de mantenimiento (MaintenanceSchedule).

Nacen sin scheduled_date (la gestión la pone al programar). requested_by
y requested_date al crear. Un responsable: ingeniero o tecnico.
Señales: asignar responsable crea/reasigna EquipmentWorkOrder (OneToOne
schedule) y sincroniza estado del equipo (En mantenimiento / En
reparación / Operativo). Al FINISHED de la OT la solicitud queda
cumplida y se crea MaintenanceRecord con el costo de la OT. Email Celery
al crear o cambiar asignación. complete en la API también marca cumplida.
"""
