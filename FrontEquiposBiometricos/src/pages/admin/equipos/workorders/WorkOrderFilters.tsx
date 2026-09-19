import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { WorkOrderFiltersProps } from "@/types/equipment/workorder-props";
import { STATUS_LABEL, TYPE_LABEL } from "@/utils/workorder.utils";

export function WorkOrderFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
}: WorkOrderFiltersProps) {
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-3">
      <Input
        placeholder="Buscar por número, equipo, técnico..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <Select
        placeholder="Todo estado"
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        options={Object.entries(STATUS_LABEL).map(([value, label]) => ({
          value,
          label,
        }))}
      />
      <Select
        placeholder="Todo tipo"
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value)}
        options={Object.entries(TYPE_LABEL).map(([value, label]) => ({
          value,
          label,
        }))}
      />
    </div>
  );
}
