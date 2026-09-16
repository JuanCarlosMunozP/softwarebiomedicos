"""HTTP de solicitudes de mantenimiento (MaintenanceSchedule).

Se puede crear sin scheduled_date; requested_by queda en el usuario
autenticado. assigned_to (write-only) enruta a ingeniero o tecnico según
rol. Acciones complete (is_completed) y notify (email Celery). Gestión
ve todo; tecnico ve las que pidió o le asignaron; usuario solo las que
pidió; ingeniero solo VIEW de las asignadas a él o que él pidió (no
crea/edita/borra solicitudes). Equipo inactivo o fecha pasada se rechazan.
Al asignar responsable, las señales de apps.scheduling crean la OT.
"""
