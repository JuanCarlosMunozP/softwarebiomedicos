"""HTTP de equipos biomédicos y órdenes de trabajo (`/api/v1/equipment/`).

Contiene views, serializers, filters y urls. No define modelos: usa
`apps.equipment`.

EquipmentViewSet: CRUD del inventario, búsqueda por asset_tag, filtros,
ordenamiento, regeneración de QR (uno o todos) e historial paginado de
mantenimientos ya realizados del equipo. El rol `tecnico` solo ve
equipos de su área.

Adjuntos, certificados e instrucciones son ViewSets hermanos sobre el
mismo permiso `equipment`.

Órdenes de trabajo (`work-orders` y recursos hijos: repuestos,
mediciones, evidencias, firmas, costos): permiso `work_orders` en
ROLE_MATRIX (el técnico no lo tiene). Técnico e ingeniero solo operan
las OT asignadas a ellos (`technician`). La acción `complete` exige
nota de resolución (`observations`); el ingeniero no puede pasar a
FINISHED si la orden sigue en PENDING (debe pasar antes a En proceso).
Al terminar, las señales de `apps.maintenance` / `apps.scheduling`
dejan el registro en el historial y cierran la solicitud de origen.
"""
