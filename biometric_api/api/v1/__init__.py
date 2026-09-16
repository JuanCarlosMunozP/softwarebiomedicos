"""API REST versión 1, montada en `/api/v1/`.

Enruta hacia los recursos de dominio: users, branches (sedes), catalog
(marcas y modelos), equipment (inventario, QR, adjuntos y órdenes de
trabajo), maintenance (historial ya ejecutado), scheduling (solicitudes),
failures (reportes de falla) y dashboard (summary agregado).

También expone autenticación JWT de dos modos: tokens en el body
(`/auth/token/`, pensado para móvil, Postman y scripts) y cookies
httpOnly + CSRF (`/auth/token/cookie/`, pensado para la SPA). El
endpoint `/health/` comprueba Postgres y Redis.

Toda autorización de recursos —salvo el módulo users, que tiene
permisos propios— pasa por `HasRolePermission` y `ROLE_MATRIX`
(rol × recurso × acción). Este paquete no contiene modelos: los
importa de `apps.*`.
"""
