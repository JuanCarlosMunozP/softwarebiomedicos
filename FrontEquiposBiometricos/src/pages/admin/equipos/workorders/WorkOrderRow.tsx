import { ClipboardList, Pencil, Trash2, ListChecks, Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { WorkOrderRowProps } from "@/types/equipment/workorder-props";
import { STATUS_LABEL, STATUS_TONE, TYPE_LABEL, formatDateTime } from "@/utils/workorder.utils";

export function WorkOrderRow({
  w,
  isEngineer,
  canEdit,
  canDelete,
  onComplete,
  onDetail,
  onEdit,
  onDelete,
}: WorkOrderRowProps) {
  return (
    <tr className="text-app">
      <td className="py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <ClipboardList size={14} />
          </span>
          <div>
            <span className="font-medium">{w.number}</span>
          </div>
        </div>
      </td>
      <td className="py-3 text-app-muted">
        {w.equipment_name ?? `Equipo #${w.equipment}`}
        {w.equipment_asset_tag && (
          <span className="ml-1 font-mono text-xs">
            {w.equipment_asset_tag}
          </span>
        )}
      </td>
      <td className="py-3">
        <Badge tone="info">
          {w.service_type_display ?? TYPE_LABEL[w.service_type]}
        </Badge>
      </td>
      <td className="py-3 text-app-muted whitespace-nowrap">
        {new Date(w.start_date).toLocaleDateString()}
      </td>
      <td className="py-3 text-app-muted whitespace-nowrap">
        {w.status === "FINISHED" || w.end_date
          ? formatDateTime(w.end_date)
          : "—"}
      </td>
      <td className="py-3 text-app-muted">
        {w.technician_name ?? (
          <span className="text-xs italic">Sin asignar</span>
        )}
      </td>
      <td className="py-3">
        <Badge tone={STATUS_TONE[w.status]}>
          {w.status_display ?? STATUS_LABEL[w.status]}
        </Badge>
      </td>
      <td className="py-3">
        <div className="flex flex-wrap justify-end gap-2">
          {canEdit &&
            (w.status === "PENDING" ||
              w.status === "IN_PROGRESS") && (
              <Button
                size="sm"
                leftIcon={<Wrench size={14} />}
                onClick={() => onComplete(w)}
              >
                Realizar mantenimiento
              </Button>
            )}
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<ListChecks size={14} />}
            onClick={() => onDetail(w)}
          >
            Detalle
          </Button>
          {canEdit && !isEngineer && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Pencil size={14} />}
              onClick={() => onEdit(w)}
            >
              Editar
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="danger"
              leftIcon={<Trash2 size={14} />}
              onClick={() => onDelete(w)}
            >
              Eliminar
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
