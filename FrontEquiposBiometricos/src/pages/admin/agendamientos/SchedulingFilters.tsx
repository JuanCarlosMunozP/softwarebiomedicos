import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { SchedulingFiltersProps } from "@/types/agendamientos/props";

export function SchedulingFilters({
  search,
  onSearchChange,
  completedFilter,
  onCompletedFilterChange,
}: SchedulingFiltersProps) {
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2">
      <Input
        placeholder="Buscar por nota o tag..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <Select
        placeholder="Todas"
        value={completedFilter}
        onChange={(e) => onCompletedFilterChange(e.target.value)}
        options={[
          { value: "false", label: "Pendientes" },
          { value: "true", label: "Cumplidas" },
        ]}
      />
    </div>
  );
}
