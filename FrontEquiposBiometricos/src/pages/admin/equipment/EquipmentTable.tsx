import { EquipmentRow } from "@/pages/admin/equipment/EquipmentRow";
import type { EquipmentTableProps } from "@/types/equipment/props";

export function EquipmentTable({
  items,
  loading,
  brands,
  models,
  branchName,
  canEdit,
  statusUpdatingId,
  onSelect,
  onChangeStatus,
}: EquipmentTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted">
            <th className="px-4 py-3 font-medium">Equipo</th>
            <th className="px-4 py-3 font-medium">Asset tag</th>
            <th className="px-4 py-3 font-medium">Sede / Ubicación</th>
            <th className="px-4 py-3 font-medium">Riesgo</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {loading ? (
            <tr>
              <td colSpan={5} className="py-10 text-center text-app-muted">
                Cargando...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-10 text-center text-app-muted">
                No se encontraron equipos con los filtros actuales.
              </td>
            </tr>
          ) : (
            items.map((eq) => (
              <EquipmentRow
                key={eq.id}
                eq={eq}
                brands={brands}
                models={models}
                branchName={branchName}
                canEdit={canEdit}
                statusUpdatingId={statusUpdatingId}
                onSelect={onSelect}
                onChangeStatus={onChangeStatus}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
