from channels.generic.websocket import AsyncJsonWebsocketConsumer

# Grupo único al que se unen todos los clientes autenticados. Cuando haga
# falta segmentar (por sede, por rol, por usuario) se agregan más grupos en
# `connect()`.
NOTIFICATIONS_GROUP = "notifications"

# Código de cierre que el frontend (lib/websocket.ts) interpreta como
# "sesión inválida/expirada": deja de reintentar.
AUTH_CLOSE_CODE = 4401


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """Canal `/ws/notifications/`: empuja eventos del backend al frontend.

    Solo recibe (server → cliente). Los mensajes que envíe el cliente se
    ignoran.
    """

    async def connect(self):
        user = self.scope.get("user")
        if user is None or not getattr(user, "is_authenticated", False):
            # Aceptamos y cerramos de inmediato con 4401 (en vez de rechazar el
            # handshake con HTTP 403) para que el navegador reciba el código en
            # `CloseEvent.code` y lib/websocket.ts deje de reintentar.
            await self.accept()
            await self.close(code=AUTH_CLOSE_CODE)
            return
        await self.channel_layer.group_add(NOTIFICATIONS_GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            NOTIFICATIONS_GROUP, self.channel_name
        )

    async def receive_json(self, content, **kwargs):
        # Canal de solo lectura: no se procesa nada entrante.
        pass

    # --- handlers de eventos del channel layer (type: "notification.message") ---
    async def notification_message(self, event):
        await self.send_json(event["payload"])
