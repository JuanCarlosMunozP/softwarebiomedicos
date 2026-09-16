"""Inventario biomédico y órdenes de trabajo.

Equipment: estado (Operativo / Fuera de servicio / En mantenimiento /
En reparación), área, sede, riesgo INVIMA, MTBF/MTTR. Adjuntos,
certificados, instrucciones y QR. EquipmentWorkOrder se enlaza OneToOne
a una solicitud (schedule) o a un MaintenanceRecord; hijos: spare_parts,
measurements, evidences, signatures y cost. Señales: QR al crear;
spare_parts_cost al cambiar repuestos. reliability.py recalcula MTBF/MTTR.
"""
