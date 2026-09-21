import type { MaintenanceTableProps } from "@/types/maintenance/props";
import { MaintenanceRow } from "@/pages/admin/maintenance/MaintenanceRow";

export function MaintenanceTable({
  items,
  loading,
  equipmentLabel,
  canEdit,
  canDelete,
  openEdit,
  setToDelete,
}: MaintenanceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted">
            <th className="pb-2 font-medium">Equipo</th>
            <th className="pb-2 font-medium">Tipo</th>
            <th className="pb-2 font-medium">Fecha</th>
            <th className="pb-2 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {loading ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-app-muted">
                Cargando...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-app-muted">
                Sin registros.
              </td>
            </tr>
          ) : (
            items.map((m) => (
              <MaintenanceRow
                key={m.id}
                m={m}
                equipmentLabel={equipmentLabel}
                canEdit={canEdit}
                canDelete={canDelete}
                openEdit={openEdit}
                setToDelete={setToDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
