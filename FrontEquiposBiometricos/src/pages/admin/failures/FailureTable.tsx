import type { FailureTableProps } from "@/types/failure/props";
import { FailureRow } from "@/pages/admin/failures/FailureRow";

export function FailureTable({
  items,
  loading,
  tableCols,
  canEdit,
  canDelete,
  equipmentLabel,
  setResolveTarget,
  setResolveNotes,
  openEdit,
  setToDelete,
}: FailureTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted">
            <th className="pb-2 font-medium">Equipo</th>
            <th className="pb-2 font-medium">Severidad</th>
            <th className="pb-2 font-medium">Reportada</th>
            <th className="pb-2 font-medium">Estado</th>
            {(canEdit || canDelete) && (
              <th className="pb-2 font-medium text-right">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {loading ? (
            <tr>
              <td colSpan={tableCols} className="py-8 text-center text-app-muted">
                Cargando...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={tableCols} className="py-8 text-center text-app-muted">
                Sin reportes.
              </td>
            </tr>
          ) : (
            items.map((f) => (
              <FailureRow
                key={f.id}
                f={f}
                canEdit={canEdit}
                canDelete={canDelete}
                equipmentLabel={equipmentLabel}
                setResolveTarget={setResolveTarget}
                setResolveNotes={setResolveNotes}
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
