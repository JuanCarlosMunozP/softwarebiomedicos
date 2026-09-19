import {
  CalendarClock,
  Check,
  Eye,
  Pencil,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  KIND_LABEL,
  formatDateTime,
  labelForRequester,
  labelForScheduleTechnician,
  scheduleEstado,
} from "@/utils/scheduling.utils";
import type { SchedulingRowProps } from "@/types/scheduling/props";

export function SchedulingRow({
  s,
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
}: SchedulingRowProps) {
  return (
    <tr className="text-app">
      <td className="py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <CalendarClock size={14} />
          </span>
          <div>
            <p className="font-medium">
              {s.equipment_name ?? equipmentLabel(s.equipment)}
            </p>
            {labelForRequester(s) && (
              <p className="text-xs text-app-muted">
                {labelForRequester(s)}
              </p>
            )}
          </div>
        </div>
      </td>
      {showRequestingArea && (
        <td className="py-3 text-app-muted">
          {s.requesting_area || (
            <span className="text-xs italic">Sin área</span>
          )}
        </td>
      )}
      <td className="py-3">
        <Badge tone={s.kind === "PREVENTIVE" ? "info" : "danger"}>
          {KIND_LABEL[s.kind]}
        </Badge>
      </td>
      <td className="py-3 text-app-muted whitespace-nowrap">
        <div>
          {s.requested_date}
        </div>
        {s.work_order?.status === "FINISHED" && (
          <div className="text-xs">
            <span className="text-xs uppercase tracking-wide">
              Fin
            </span>{" "}
            {formatDateTime(s.work_order.end_date)}
          </div>
        )}
      </td>
      <td className="py-3 text-app-muted">
        {labelForScheduleTechnician(s) ? (
          <span className="inline-flex items-center gap-1.5">
            <User size={12} className="text-app-muted" />
            <span className="text-app">
              {labelForScheduleTechnician(s)}
            </span>
          </span>
        ) : (
          <span className="text-xs italic">Sin asignar</span>
        )}
      </td>
      <td className="py-3">
        <Badge tone={scheduleEstado(s).tone}>
          {scheduleEstado(s).label}
        </Badge>
      </td>
      <td className="py-3">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Eye size={14} />}
            onClick={() => onView(s)}
          >
            Detalle
          </Button>
          {s.work_order ? (
            canOpenWorkOrder ? (
              <Button
                size="sm"
                leftIcon={<Wrench size={14} />}
                onClick={() => onOpenWorkOrders()}
              >
                Ver orden de trabajo
              </Button>
            ) : (
              <span className="text-xs text-app-muted">
                Orden {s.work_order.number}
              </span>
            )
          ) : (
            canRegisterMaintenance &&
            !canOpenWorkOrder &&
            !s.is_completed && (
              <Button
                size="sm"
                leftIcon={<Wrench size={14} />}
                onClick={() => onRegisterMaintenance(s)}
              >
                Realizar mantenimiento
              </Button>
            )
          )}
          {canEdit && !s.is_completed && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Check size={14} />}
              onClick={() => onComplete(s)}
            >
              Cumplir
            </Button>
          )}
          {canEdit && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Pencil size={14} />}
              onClick={() => onEdit(s)}
            >
              {s.scheduled_date ? "Editar" : "Programar"}
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="danger"
              leftIcon={<Trash2 size={14} />}
              onClick={() => onDelete(s)}
            >
              Eliminar
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
