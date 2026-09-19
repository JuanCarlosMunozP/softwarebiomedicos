import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { KIND_LABEL } from "@/utils/maintenance.utils";
import type { MaintenanceFilterProps } from "@/types/maintenance/props";

export function MaintenanceFilter({
  search,
  setSearch,
  equipmentFilter,
  setEquipmentFilter,
  equipmentOptions,
  kindFilter,
  setKindFilter,
}: MaintenanceFilterProps) {
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-3">
      <Input
        placeholder="Buscar descripción, técnico..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Select
        placeholder="Todos los equipos"
        value={equipmentFilter}
        onChange={(e) => setEquipmentFilter(e.target.value)}
        options={equipmentOptions}
      />
      <Select
        placeholder="Todos los tipos"
        value={kindFilter}
        onChange={(e) => setKindFilter(e.target.value)}
        options={Object.entries(KIND_LABEL).map(([value, label]) => ({
          value,
          label,
        }))}
      />
    </div>
  );
}
