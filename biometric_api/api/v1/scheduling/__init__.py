"""HTTP de solicitudes de mantenimiento (`/api/v1/scheduling/`).

CRUD de `MaintenanceSchedule`. Se puede crear sin `scheduled_date`;
`requested_by` queda en el usuario autenticado y `requested_date` al
crear. El campo write-only `assigned_to` enruta el responsable a
ingeniero o técnico según su rol.

Acciones extra: `complete` marca `is_completed`; `notify` encola el
email Celery (`send_schedule_notification`). Gestión (superadmin,
admin, coordinador) ve todo. El técnico ve las que pidió o le
asignaron. El rol `usuario` solo las que él pidió. El ingeniero tiene
VIEW de las asignadas a él o que él pidió; no crea/edita/borra
solicitudes.

Se rechaza equipo inactivo. Al crear, la fecha programada no puede ser
pasada (en edición sí se admite). Al asignar responsable, las señales
de `apps.scheduling` crean o reasignan la orden de trabajo (OneToOne
`schedule`) y sincronizan el estado del equipo (En mantenimiento /
En reparación / Operativo).
"""
