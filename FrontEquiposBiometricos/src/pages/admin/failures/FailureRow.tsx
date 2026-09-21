import { AlertTriangle, CheckCheck, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { FailureRowProps } from "@/types/failure/props";
import { SEV_LABEL, SEV_TONE } from "@/utils/failure.utils";

export function FailureRow({
  f,
  canEdit,
  canDelete,
  equipmentLabel,
  setResolveTarget,
  setResolveNotes,
  openEdit,
  setToDelete,
}: FailureRowProps) {
  return (
    <tr className="text-app">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <AlertTriangle size={14} />
          </span>
          <div>
            <p className="font-medium">
              {f.equipment_asset_tag
                ? f.equipment_asset_tag
                : equipmentLabel(f.equipment)}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
         {f.branch_name && (
              <p className="text-xs">{f.branch_name}</p>
            )}
      </td>
      <td className="px-4 py-3">
        <Badge tone={SEV_TONE[f.severity]}>
          {SEV_LABEL[f.severity]}
        </Badge>
      </td>
      <td className="py-3 text-app-muted">
        {new Date(f.reported_at).toLocaleString()}
      </td>
      <td className="py-3">
        <Badge tone={f.resolved ? "success" : "warning"}>
          {f.resolved ? "Resuelta" : "Abierta"}
        </Badge>
      </td>
      {(canEdit || canDelete) && (
      <td className="py-3">
        <div className="flex justify-end gap-2">
          {canEdit && !f.resolved && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<CheckCheck size={14} />}
              onClick={() => {
                setResolveTarget(f);
                setResolveNotes("");
              }}
            >
              Resolver
            </Button>
          )}
          {canEdit && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Pencil size={14} />}
              onClick={() => openEdit(f)}
            >
              Editar
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="danger"
              leftIcon={<Trash2 size={14} />}
              onClick={() => setToDelete(f)}
            >
              Eliminar
            </Button>
          )}
        </div>
      </td>
      )}
    </tr>
  );
}
