# biometric_api

API REST del **Sistema de Gestión de Equipos Biomédicos** (PBioSoft). Centraliza el inventario, las hojas de vida, las solicitudes de mantenimiento, las órdenes de trabajo, el historial ya ejecutado, las fallas y los usuarios por sede, para que la clínica deje de manejar esa información a mano.

La consume el frontend web (`FrontEquiposBiometricos`) y la app móvil (`EbMobile`). Una sola API, dos formas de autenticarse.

## Qué cubre

- Inventario de equipos (placa, serie, sede, marca/modelo, área, estado, QR, imagen y adjuntos de hoja de vida).
- Catálogo de marcas y modelos.
- Sedes.
- Usuarios y roles (superadministrador, administrador, coordinador, ingeniero biomédico, usuario operativo y usuario).
- Solicitudes de mantenimiento (preventivo o reparación), asignación de responsable y avisos.
- Órdenes de trabajo (pendiente / en proceso / finalizada / cancelada), con repuestos, mediciones, evidencias, firmas y costos.
- Historial de mantenimientos ya realizados (no el trabajo en curso).
- Reportes de falla y recálculo de MTBF / MTTR del equipo.
- Tablero agregado (KPIs, series y colas según el rol).
- Auditoría de acciones sensibles y notificaciones en tiempo real.

## Cómo está organizado el código

El dominio y el HTTP están separados a propósito:

| Carpeta | Qué hay |
|---|---|
| `apps/` | Lógica de negocio: modelos, managers, señales, tareas Celery, admin Django y tests. |
| `api/v1/` | Capa HTTP: vistas, serializers, filtros y URLs REST. No define modelos; importa los de `apps.*`. |
| `config/` | Arranque Django: settings, URLs raíz, ASGI/WSGI, Celery. |
| `docker/` | Imagen de desarrollo y producción. |

Cada recurso de negocio tiene el mismo nombre en ambos árboles (`apps.equipment` ↔ `api.v1.equipment`, etc.).

## Stack

- **Django 5** + **Django REST Framework**
- **PostgreSQL** (datos)
- **Redis** (caché, broker de Celery y channel layer de WebSockets)
- **Celery** (correos de solicitud y cola de vencidos)
- **Django Channels** (notificaciones en `/ws/notifications/`)
- **SimpleJWT** (acceso + refresh, rotación y blacklist)
- **OpenAPI** (drf-spectacular): schema en `/api/schema/`, Swagger en `/api/docs/`, ReDoc en `/api/redoc/`
- Locale `es-CO`, zona `America/Bogota`

En local se levanta con Docker Compose (`web` en `:8000`, worker, Flower `:5555`, Mailpit `:8025`). Cómo encaja con el frontend y el móvil está en el [README raíz del repo](../README.md).

## Autenticación

Todos los recursos de negocio viven bajo `/api/v1/`. Hay dos modos de JWT, el mismo validador acepta ambos (`CookieJWTAuthentication`):

| Cliente | Login | Cómo viaja el token |
|---|---|---|
| Frontend web | `/api/v1/auth/token/cookie/` | Cookies httpOnly (`access_token`) + CSRF en mutaciones |
| App móvil, Postman, scripts | `/api/v1/auth/token/` | Header `Authorization: Bearer …` |

También hay refresh, verify, blacklist (body) y logout de cookies. El login es por **nombre de usuario**, no por correo. `/api/v1/health/` comprueba Postgres y Redis.

`/admin/` no abre el admin de Django: redirige a la HomePage del frontend (`FRONTEND_BASE_URL`). El admin de Django queda en `/django-admin/`.

## Roles y permisos

La autorización de recursos (salvo usuarios) pasa por `HasRolePermission` y `ROLE_MATRIX` en `api/v1/common/permissions.py` (rol × recurso × view/create/edit/delete). El frontend solo esconde botones; la API es quien impone la regla.

| Rol | Alcance general |
|---|---|
| **Superadministrador** | Gestión plena, incluido mutar el historial de mantenimientos. |
| **Administrador** | Gestión de sedes, inventario, solicitudes, fallas y OT. El historial de mantenimientos es solo consulta. |
| **Coordinador** | Inventario (sin borrar), solicitudes, fallas y OT. Sedes e historial en consulta. |
| **Ingeniero biomédico** | Consulta inventario, sedes y solicitudes asignadas. Ejecuta OT y reporta/edita fallas. |
| **Usuario operativo** (`tecnico`) | Recorte por `area` (p. ej. Radiología): ve equipos de su área, crea fallas y solicitudes. No tiene OT, sedes ni historial. |
| **Usuario** | Consulta inventario y crea/ve solo las solicitudes que él pidió. |

El módulo de usuarios no usa esa matriz: tiene permisos propios (alta/baja/edición de cuentas, perfil `me`, cambio de contraseña).

## Módulos de dominio (`apps/`)

### `users`

`User` (AbstractUser) con email único, nombres, teléfono, `role` y `area` (esta última solo tiene sentido en el rol operativo). El manager da de alta con rol. HTTP en `/api/v1/users/`: listado, CRUD restringido, `me`, cambio de contraseña. Superadmin y admin ven a todos; coordinador e ingeniero solo ven ingenieros y técnicos activos (selectores de responsable). Los cambios de rol, de activo y de contraseña se registran en auditoría.

### `branches`

Sedes: nombre, dirección, ciudad, teléfono, email opcional, activa/inactiva. No se borra una sede que todavía tenga equipos (PROTECT → 409). HTTP en `/api/v1/branches/`.

### `catalog`

Marcas (`Brand`) y modelos (`EquipmentModel`, únicos por marca + nombre). `is_active` permite ocultar sin borrar. Quien gestiona inventario gestiona el catálogo (permiso `equipment`). HTTP en `/api/v1/catalog/`.

### `equipment`

Inventario y órdenes de trabajo.

- **Equipment**: placa única, serie, sede, modelo, área, estado (Operativo / Fuera de servicio / En mantenimiento / En reparación), clase de riesgo INVIMA, tipo de tecnología, imagen, MTBF/MTTR persistidos y QR PNG. El payload del QR es `{FRONTEND_BASE_URL}/admin/equipos/{id}`.
- **Hoja de vida**: instrucciones, certificados y adjuntos genéricos.
- **EquipmentWorkOrder**: número, tipo, estado, técnico asignado, fechas; OneToOne opcional a la solicitud y/o al registro de historial. Hijos: repuestos, mediciones, evidencias, firmas y costos.

Señales: QR al crear, recálculo de costo de repuestos, sincronización de estado del equipo con las OT abiertas. Comandos: `import_equipment` (CSV) y `regenerate_qr`. HTTP en `/api/v1/equipment/` (CRUD, filtros, regenerar QR, historial del equipo) y recursos hermanos (`attachments`, `certificates`, `instructions`, `work-orders` y sus hijos). Completar una OT exige nota de resolución.

### `scheduling`

Solicitudes (`MaintenanceSchedule`): equipo, tipo (preventivo / reparación), quién pidió, fecha de solicitud, fecha programada opcional, responsable, notas, cumplida o no.

Al asignar responsable se crea o reasigna la orden de trabajo y se actualiza el estado del equipo. Al finalizar la OT, la solicitud queda cumplida. Celery envía el correo de asignación y, si hay vencidos, alertas por WebSocket. HTTP en `/api/v1/scheduling/` (CRUD, `complete`, `notify`).

### `maintenance`

Historial ya cerrado (`MaintenanceRecord`): tipo (preventivo, correctivo, reparación, calibración, inspección), fecha, descripción, observaciones, responsables, costo, PDF opcional. No es el flujo “en proceso”: eso vive en la OT. Solo el superadmin muta este recurso. HTTP en `/api/v1/maintenance/`.

### `failures`

Reportes de falla: equipo, descripción, severidad (Baja–Crítica), quién reportó, resuelto o no. La acción `resolve` es idempotente. Tras guardar o borrar se recalculan MTBF y MTTR del equipo. HTTP en `/api/v1/failures/`.

### `audit`

Sin API propia. `AuditLog` guarda actor, acción, modelo, objeto, cambios JSON e IP. Lo escriben el mixin de borrados y el módulo de usuarios (rol, activo, contraseña). Se consulta en el admin de Django.

### `realtime`

Sin modelos. WebSocket de solo lectura en `/ws/notifications/` (JWT por cookie o Bearer). Eventos que emite el negocio: correo de solicitud enviado (`schedule_email_sent`) y mantenimiento vencido (`overdue_maintenance`).

### `dashboard`

No es una app Django con modelos. Agrupa tests del summary. El endpoint `GET /api/v1/dashboard/summary/` arma KPIs, series de 6 meses, vencidos, peores MTBF y colas por rol (`my_tasks`, `area_ops`, `engineer_tasks`, etc.). Si hay vencidos, encola las alertas en Celery.

## Capa HTTP (`api/v1/`)

Además de los recursos de arriba, `api/v1/common/` concentra lo transversal: matriz de permisos, recorte por área del operativo, paginación, validación de archivos, autenticación cookie/Bearer, mixin de auditoría, health y vistas JWT.

Rutas principales:

```
/api/v1/health/
/api/v1/auth/token/                  (móvil / scripts)
/api/v1/auth/token/cookie/           (web)
/api/v1/users/
/api/v1/branches/
/api/v1/catalog/
/api/v1/equipment/                   (+ adjuntos, certificados, instrucciones, OT)
/api/v1/scheduling/
/api/v1/maintenance/
/api/v1/failures/
/api/v1/dashboard/summary/
```

El contrato detallado (campos, códigos, ejemplos) está en Swagger: `http://localhost:8000/api/docs/`.
