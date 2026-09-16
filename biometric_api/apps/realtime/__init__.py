"""Notificaciones en tiempo real (Django Channels).

NotificationConsumer en /ws/notifications/ es solo lectura; JWT por
cookie o Bearer; cierra 4401 si no hay sesión. broadcast_notification()
publica al grupo global; si Redis falla, no levanta. La tarea Celery de
email de agendamiento emite schedule_email_sent al terminar el correo.
"""
