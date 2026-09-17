"""HTTP del tablero (GET `/api/v1/dashboard/summary/`).

Una sola respuesta, sin caché, pensada para la SPA y el resumen móvil.
No hay modelos propios: agrega equipos, fallas, solicitudes,
mantenimientos y OT leyendo `apps.*`.

KPIs: equipos por estado, fallas críticas/abiertas, solicitudes
próximas (7 días) y vencidas (pendientes, con `scheduled_date` no nula
y ≤ hoy), mantenimientos del mes y costo. Distribuciones (estado de
equipo, fallas por severidad). Series de 6 meses y, para coordinador y
superadmin, puntos de solicitudes y costos para filtrar por fecha.

Listas: hasta 10 solicitudes vencidas y equipos con peor MTBF.
`my_tasks` / `my_week`: lo asignado al usuario (técnico: semana por
área). `area_ops`: fallas del operativo vs solicitudes que creó el
rol `usuario`. `engineer_tasks`: KPIs y cola de OT del ingeniero
(asignadas, pendientes, en proceso, resueltas) más una serie de
fechas para filtrar en cliente.

Si el KPI de vencidos es mayor que cero, se encola en Celery
`queue_overdue_alerts` (alertas WS una a una, no en ráfaga).
La agregación y el payload por rol están en `views.py`.
"""
