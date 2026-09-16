"""HTTP de usuarios. No usa ROLE_MATRIX; tiene permissions propias.

Listado: superadmin/admin ven todos; coordinador e ingeniero solo activos
ingeniero/tecnico (selectores de responsable). Crear/borrar/editar a
otros exige IsAdminRole. Cada quien ve/edita su perfil y cambia su
contraseña, sin tocar su propio rol ni estado. Solo superadmin opera
sobre otro superadmin. Cambios de rol/activo y password van a AuditLog.
El endpoint me devuelve el usuario autenticado.
"""
