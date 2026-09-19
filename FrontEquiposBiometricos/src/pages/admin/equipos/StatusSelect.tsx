import { STATUS_BADGE_CLASS, STATUS_LABEL } from "@/utils/equipment.utils";
import type { EquipmentStatus } from "@/types/equipment/equipment";
import type { StatusSelectProps } from "@/types/equipment/props";

export function StatusSelect({
  value,
  disabled,
  onChange,
}: StatusSelectProps) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as EquipmentStatus)}
      title="Cambiar estado"
      className={`appearance-none rounded-full border px-2.5 py-1 pr-6 text-xs font-medium outline-none transition focus:ring-2 focus:ring-[var(--color-primary)]/30 disabled:cursor-not-allowed disabled:opacity-60 ${STATUS_BADGE_CLASS[value]}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 20 20' fill='currentColor'><path d='M5.5 7.5l4.5 4.5 4.5-4.5z'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 6px center",
      }}
    >
      {(Object.keys(STATUS_LABEL) as EquipmentStatus[]).map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
