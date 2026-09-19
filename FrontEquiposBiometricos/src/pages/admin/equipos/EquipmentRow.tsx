import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { StatusSelect } from "@/pages/admin/equipos/StatusSelect";
import { RISK_TONE, STATUS_LABEL, STATUS_TONE } from "@/utils/equipment.utils";
import type { EquipmentRowProps } from "@/types/equipment/props";

export function EquipmentRow({
  eq,
  brands,
  models,
  branchName,
  canEdit,
  statusUpdatingId,
  onSelect,
  onChangeStatus,
}: EquipmentRowProps) {
  const brandText =
    eq.brand_name ??
    brands.find((b) => b.id === eq.brand)?.name ??
    brands.find(
      (b) =>
        b.id ===
        models.find((m) => m.id === eq.equipment_model)?.brand,
    )?.name ??
    "—";
  const modelText =
    eq.equipment_model_name ??
    models.find((m) => m.id === eq.equipment_model)?.name ??
    `#${eq.equipment_model}`;
  return (
    <tr
      onClick={() => onSelect(eq)}
      className="cursor-pointer text-app transition hover:bg-app-muted/50"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <ClipboardList size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{eq.name}</p>
            <p className="truncate text-xs text-app-muted">
              {brandText} · {modelText}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-app-muted">
        {eq.asset_tag}
      </td>
      <td className="px-4 py-3 text-app-muted">
        <p>{eq.branch_name ?? branchName(eq.branch)}</p>
        <p className="text-xs">{eq.location}</p>
      </td>
      <td className="px-4 py-3">
        <Badge tone={RISK_TONE[eq.risk_class]}>
          {eq.risk_class}
        </Badge>
      </td>
      <td
        className="px-4 py-3"
        onClick={(ev) => ev.stopPropagation()}
      >
        {canEdit ? (
          <StatusSelect
            value={eq.status}
            disabled={statusUpdatingId === eq.id}
            onChange={(s) => onChangeStatus(eq, s)}
          />
        ) : (
          <Badge tone={STATUS_TONE[eq.status]}>
            {STATUS_LABEL[eq.status]}
          </Badge>
        )}
      </td>
    </tr>
  );
}
