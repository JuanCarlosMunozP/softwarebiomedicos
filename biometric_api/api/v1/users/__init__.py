"""HTTP de usuarios (`/api/v1/users/`).

No usa ROLE_MATRIX: tiene clases de permiso propias en este paquete.
Listado: superadmin y admin ven todos; coordinador e ingeniero solo
usuarios activos con rol ingeniero o técnico (selectores de
responsable de OT/solicitud). Crear, borrar o editar a otros exige
`IsAdminRole`.

Cada quien consulta y edita su perfil y cambia su contraseña, sin
poder tocar su propio rol ni su estado activo. Solo el superadmin
opera sobre otro superadmin. Los cambios de rol, de activo y de
contraseña se registran en `AuditLog`. El endpoint `me` devuelve el
usuario autenticado (sesión actual).
"""
