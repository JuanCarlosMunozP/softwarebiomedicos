import { SchedulingRow } from "@/pages/admin/scheduling/SchedulingRow";
import type { SchedulingTableProps } from "@/types/scheduling/props";

export function SchedulingTable({
  items,
  loading,
  tableColSpan,
  showRequestingArea,
  equipmentLabel,
  canOpenWorkOrder,
  canRegisterMaintenance,
  canEdit,
  canDelete,
  onView,
  onOpenWorkOrders,
  onRegisterMaintenance,
  onComplete,
  onEdit,
  onDelete,
}: SchedulingTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted [&>th]:pb-2 [&>th]:pr-6 [&>th]:font-medium [&>th]:whitespace-nowrap">
            <th>Equipo</th>
            {showRequestingArea && <th>Área solicitante</th>}
            <th>Tipo</th>
            <th>Fecha de Solicitud</th>
            <th>Asignado a</th>
            <th>Estado</th>
            <th className="pr-0 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] [&>tr>td]:pr-6 [&>tr>td]:align-top">
          {loading ? (
            <tr>
              <td
                colSpan={tableColSpan}
                className="py-8 text-center text-app-muted"
              >
                Cargando...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td
                colSpan={tableColSpan}
                className="py-8 text-center text-app-muted"
              >
                Sin solicitudes.
              </td>
            </tr>
          ) : (
            items.map((s) => (
              <SchedulingRow
                key={s.id}
                s={s}
                showRequestingArea={showRequestingArea}
                equipmentLabel={equipmentLabel}
                canOpenWorkOrder={canOpenWorkOrder}
                canRegisterMaintenance={canRegisterMaintenance}
                canEdit={canEdit}
                canDelete={canDelete}
                onView={onView}
                onOpenWorkOrders={onOpenWorkOrders}
                onRegisterMaintenance={onRegisterMaintenance}
                onComplete={onComplete}
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
