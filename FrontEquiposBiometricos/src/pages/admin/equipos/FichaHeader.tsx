import {
  AlertTriangle,
  Building2,
  Calendar as CalendarIcon,
  Download,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { FichaHeaderProps } from "@/types/equipment/ficha";
import { STATUS_LABEL, STATUS_TONE } from "@/utils/ficha.utils";

export function FichaHeader({
  qrSrc,
  eq,
  downloadQr,
  canEdit,
  regenerateQr,
  regeneratingQr,
  canDelete,
  role,
  onEdit,
  onDelete,
  navigate,
  branchLabel,
}: FichaHeaderProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-xl border border-app bg-white p-3">
          {qrSrc ? (
            <img
              src={qrSrc}
              alt={`QR del equipo ${eq.asset_tag}`}
              className="h-40 w-40 object-contain"
            />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center text-xs text-app-muted">
              Sin QR
            </div>
          )}
        </div>
        <p className="font-mono text-xs text-app-muted">{eq.asset_tag}</p>
        <p className="max-w-40 text-center text-[11px] text-app-muted">
          Al escanearlo abre esta hoja de vida.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Download size={14} />}
            disabled={!qrSrc}
            onClick={() => void downloadQr()}
          >
            Descargar
          </Button>
          {canEdit && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<RefreshCw size={14} />}
              loading={regeneratingQr}
              onClick={() => void regenerateQr()}
            >
              Regenerar
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-app">{eq.name}</h3>
          <Badge tone={STATUS_TONE[eq.status]}>{STATUS_LABEL[eq.status]}</Badge>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Marca / Modelo">
            {(eq.brand_name ?? "—") +
              " · " +
              (eq.equipment_model_name ?? `Modelo #${eq.equipment_model}`)}
          </Field>
          <Field label="Fecha de compra" icon={<CalendarIcon size={12} />}>
            {eq.purchase_date}
          </Field>
          <Field label="Sede" icon={<Building2 size={12} />}>
            {branchLabel}
          </Field>
          <Field label="Ubicación">{eq.location}</Field>
        </dl>

        {(canEdit || canDelete || role === "tecnico") && (
          <div className="mt-1 flex flex-wrap gap-2">
            {canEdit && onEdit && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Pencil size={14} />}
                onClick={() => onEdit(eq)}
              >
                Editar
              </Button>
            )}
            {canDelete && onDelete && (
              <Button
                size="sm"
                variant="danger"
                leftIcon={<Trash2 size={14} />}
                onClick={() => onDelete(eq)}
              >
                Eliminar
              </Button>
            )}
            {role === "tecnico" && (
              <Button
                size="sm"
                leftIcon={<AlertTriangle size={14} />}
                onClick={() => navigate("/admin/fallas")}
              >
                Reportar falla
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs uppercase tracking-wider text-app-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-app">{children}</dd>
    </div>
  );
}
