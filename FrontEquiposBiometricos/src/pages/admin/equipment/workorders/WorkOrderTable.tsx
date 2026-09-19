import type { WorkOrderTableProps } from "@/types/equipment/workorder-props";
import { WorkOrderRow } from "@/pages/admin/equipment/workorders/WorkOrderRow";

export function WorkOrderTable({
  items,
  loading,
  isEngineer,
  canEdit,
  canDelete,
  onComplete,
  onDetail,
  onEdit,
  onDelete,
}: WorkOrderTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted [&>th]:pb-2 [&>th]:pr-6 [&>th]:font-medium [&>th]:whitespace-nowrap">
            <th>Orden</th>
            <th>Equipo</th>
            <th>Tipo</th>
            <th>Inicio</th>
            <th>{isEngineer ? "Fecha fin" : "Fecha de realización"}</th>
            <th>Técnico</th>
            <th>Estado</th>
            <th className="pr-0 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] [&>tr>td]:pr-6 [&>tr>td]:align-top">
          {loading ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-app-muted">
                Cargando...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-app-muted">
                Sin órdenes de trabajo.
              </td>
            </tr>
          ) : (
            items.map((w) => (
              <WorkOrderRow
                key={w.id}
                w={w}
                isEngineer={isEngineer}
                canEdit={canEdit}
                canDelete={canDelete}
                onComplete={onComplete}
                onDetail={onDetail}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
