"""API REST v1 (/api/v1/).

Enruta hacia branches, catalog, equipment (incluye órdenes de trabajo),
maintenance, scheduling, failures, dashboard y users. También expone
autenticación JWT (body y cookie httpOnly) y el endpoint de salud.
Toda autorización de recursos (salvo users) pasa por HasRolePermission.
"""
