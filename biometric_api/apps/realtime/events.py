"""Helpers para publicar eventos hacia el canal `/ws/notifications/`.

Se llaman desde tareas Celery / señales del backend. Si el channel layer no
está configurado (p. ej. un comando de management puntual) la publicación es
un no-op silencioso — nunca debe tumbar la lógica de negocio.
"""
from __future__ import annotations

from typing import Any

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .consumers import NOTIFICATIONS_GROUP


def broadcast_notification(payload: dict[str, Any]) -> None:
    """Envía `payload` (ya serializable a JSON) a todos los clientes conectados."""
    layer = get_channel_layer()
    if layer is None:
        return
    async_to_sync(layer.group_send)(
        NOTIFICATIONS_GROUP,
        {"type": "notification.message", "payload": payload},
    )
