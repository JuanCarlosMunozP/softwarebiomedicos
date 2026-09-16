"""Utilidades compartidas de la API v1.

HasRolePermission + ROLE_MATRIX: rol × recurso × acción (espejo del
frontend). operativo_area() acota querysets del rol tecnico por su área.
DefaultPagination honra page_size hasta 200. validate_uploaded_file
revisa extensión, tamaño y magic bytes. CookieJWTAuthentication acepta
Bearer o cookie access_token (CSRF en mutaciones por cookie).
AuditLogMixin registra borrados. HealthView comprueba Postgres y Redis.
"""
