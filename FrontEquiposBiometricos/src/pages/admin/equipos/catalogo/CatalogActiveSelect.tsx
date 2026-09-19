

export function CatalogActiveSelect({
  value,
  disabled,
  activeLabel,
  inactiveLabel,
  onChange,
}: {
  value: boolean;
  disabled?: boolean;
  activeLabel: string;
  inactiveLabel: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <select
      value={value ? "true" : "false"}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === "true")}
      title="Cambiar estado"
      className={`appearance-none rounded-full border px-2.5 py-1 pr-6 text-xs font-medium outline-none transition focus:ring-2 focus:ring-[var(--color-primary)]/30 disabled:cursor-not-allowed disabled:opacity-60 ${
        value
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
          : "border-app bg-app-muted text-app-muted hover:bg-app-muted/70 dark:hover:bg-white/10 dark:hover:text-app"
      }`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 20 20' fill='currentColor'><path d='M5.5 7.5l4.5 4.5 4.5-4.5z'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 6px center",
      }}
    >
      <option value="true">{activeLabel}</option>
      <option value="false">{inactiveLabel}</option>
    </select>
  );
}
