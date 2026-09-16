"""Auditoría de acciones sensibles.

AuditLog guarda actor, acción (create/update/delete), modelo, objeto,
cambios JSON e IP. log_audit_event() lo invocan borrados (AuditLogMixin),
cambios de rol/activo y cambios de contraseña. No hay endpoints propios:
es infraestructura de trazabilidad.
"""
