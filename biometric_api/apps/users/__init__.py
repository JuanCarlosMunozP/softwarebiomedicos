"""Usuarios (AbstractUser).

Roles: superadmin, admin, coordinador, ingeniero, tecnico (Usuario
operativo, con area p. ej. Radiología) y usuario. Email único; teléfono
con regex. is_admin_role agrupa superadmin y admin. Manager propio para
alta con rol. El operativo se recorta por area en equipos, fallas y
solicitudes; el rol usuario solo ve las solicitudes que él creó.
"""
