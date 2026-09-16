"""Capa HTTP del proyecto (paquete `api`).

No define modelos, señales ni reglas de negocio: solo agrupa las APIs
REST versionadas que consumen el frontend web y la app móvil bajo el
prefijo `/api/`. Hoy existe únicamente `api.v1`; versiones futuras
(v2, etc.) se añadirían como hermanos de ese paquete sin tocar el
dominio en `apps.*`.

Las URLs raíz de Django (`config.urls`) incluyen este árbol. La
autorización, paginación, JWT y utilidades compartidas viven en
`api.v1.common`; cada recurso (equipos, sedes, fallas, etc.) tiene su
propio subpaquete con views, serializers, filters y urls.
"""
