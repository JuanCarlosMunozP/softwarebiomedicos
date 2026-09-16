"""HTTP del tablero (GET /dashboard/summary/).

Un resumen sin caché para la SPA: KPIs de equipos, fallas, solicitudes
y mantenimientos, series y listados. El técnico ve agendamientos y
mantenimientos asignados a él y my_week por área. El coordinador recibe
series de solicitudes y costos. area_ops distingue fallas del operativo
frente a solicitudes del rol usuario. engineer_tasks es solo del ingeniero.
La agregación está en helpers.py; views.py arma la respuesta por rol.
"""
