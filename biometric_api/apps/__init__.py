"""Apps de dominio Django (`apps`).

Aquí vive la lógica de negocio: modelos, managers, señales, tareas
Celery, admin y tests. Las vistas HTTP, serializers y URLs REST no
están en este árbol: están en `api.v1.<dominio>`.

Apps incluidas:
- `users`: User (AbstractUser) y roles.
- `branches`: sedes.
- `catalog`: marcas y modelos.
- `equipment`: inventario, QR, adjuntos y órdenes de trabajo.
- `scheduling`: solicitudes de mantenimiento y alertas de vencidos.
- `maintenance`: historial ya ejecutado.
- `failures`: reportes de falla y recálculo de MTBF/MTTR.
- `audit`: AuditLog (sin API propia).
- `realtime`: WebSocket de notificaciones (sin modelos).
- `dashboard`: contenedor de tests del summary (sin modelos).

Importar un modelo de dominio desde `apps.<app>.models`, no desde
`api.v1`.
"""
