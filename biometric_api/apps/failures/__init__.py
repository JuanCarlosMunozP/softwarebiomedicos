"""Reportes de falla (FailureRecord).

Severidad Baja–Crítica, reportado por, resolved/resolved_at con
constraints (coherencia y resolved_at >= reported_at). mark_resolved()
es idempotente. Tras guardar o borrar, las señales piden a reliability
recalcular MTBF/MTTR del equipo.
"""
