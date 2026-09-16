"""HTTP del historial de mantenimientos realizados (MaintenanceRecord).

Es el registro ya cerrado (con PDF opcional), no la ejecución en curso.
ROLE_MATRIX: solo superadmin muta; admin/coordinador/ingeniero tienen
VIEW; tecnico y usuario no tienen el recurso. Si el queryset llega a
técnico o ingeniero, se recorta a lo asignado a ellos y se excluyen
registros cuya OT sigue PENDING, IN_PROGRESS o CANCELLED (eso vive en
órdenes de trabajo). Gestión ve todos, incluidos los en curso.
"""
