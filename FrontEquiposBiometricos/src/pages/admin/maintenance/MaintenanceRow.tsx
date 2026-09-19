import { CalendarClock, FileText, Pencil, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { KIND_LABEL, KIND_TONE, labelForTechnician } from "@/utils/maintenance.utils";
import type { MaintenanceRowProps } from "@/types/maintenance/props";

export function MaintenanceRow({
  m,
  equipmentLabel,
  canEdit,
  canDelete,
  openEdit,
  setToDelete,
}: MaintenanceRowProps) {
  return (
    <tr className="text-app">
      <td className="py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Wrench size={14} />
          </span>
          <div>
            <p className="font-medium">
              {m.equipment_name ?? equipmentLabel(m.equipment)}
            </p>
            {m.equipment_asset_tag && (
              <p className="text-xs text-app-muted">
                <span className="font-mono">{m.equipment_asset_tag}</span>
              </p>
            )}
            {m.scheduled_maintenance_detail && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-app-muted">
                <CalendarClock size={11} />
                Programado para{" "}
                {m.scheduled_maintenance_detail.scheduled_date}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="py-3">
        <Badge tone={KIND_TONE[m.kind]}>{KIND_LABEL[m.kind]}</Badge>
      </td>
      <td className="py-3 text-app-muted">{m.date}</td>
      <td className="py-3 text-app-muted">{labelForTechnician(m)}</td>
      <td className="py-3 text-app-muted">
        {m.cost ? `$${m.cost}` : "—"}
      </td>
      <td className="py-3">
        {m.pdf_file_url ? (
          <a
            href={m.pdf_file_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <FileText size={12} /> Ver PDF
          </a>
        ) : (
          <span className="text-xs text-app-muted">—</span>
        )}
      </td>
      <td className="py-3">
        <div className="flex items-center justify-end gap-2">
          {m.work_order && (
            <span className="text-xs text-app-muted">
              Orden {m.work_order.number}
            </span>
          )}
          {canEdit && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Pencil size={14} />}
              onClick={() => openEdit(m)}
            >
              Editar
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="danger"
              leftIcon={<Trash2 size={14} />}
              onClick={() => setToDelete(m)}
            >
              Eliminar
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
