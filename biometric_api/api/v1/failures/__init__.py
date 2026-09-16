"""HTTP de reportes de falla (FailureRecord).

CRUD más acción resolve (mark_resolved, idempotente en resolved_at).
Superadmin/admin/coordinador/ingeniero editan; tecnico solo view/create
y únicamente sobre equipos de su área / reportes propios. Al guardar o
borrar, las señales del dominio recalculan MTBF/MTTR del equipo.
"""
