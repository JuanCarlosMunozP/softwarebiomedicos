import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { RISK_LABEL, STATUS_LABEL } from "@/utils/equipment.utils";
import type { EquipmentFiltersProps } from "@/types/equipment/props";

export function EquipmentFilters({
  search,
  onSearchChange,
  branchFilter,
  onBranchFilterChange,
  brandFilter,
  onBrandFilterChange,
  statusFilter,
  onStatusFilterChange,
  riskFilter,
  onRiskFilterChange,
  branchOptions,
  brands,
}: EquipmentFiltersProps) {
  return (
    <Card>
      <div className="grid gap-2 sm:grid-cols-5">
        <Input
          placeholder="Buscar nombre o tag..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <Select
          placeholder="Todas las sedes"
          value={branchFilter}
          onChange={(e) => onBranchFilterChange(e.target.value)}
          options={branchOptions}
        />
        <Select
          placeholder="Todas las marcas"
          value={brandFilter}
          onChange={(e) => onBrandFilterChange(e.target.value)}
          options={brands.map((b) => ({
            value: String(b.id),
            label: b.name,
          }))}
        />
        <Select
          placeholder="Todos los estados"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          options={Object.entries(STATUS_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Select
          placeholder="Todas las clases"
          value={riskFilter}
          onChange={(e) => onRiskFilterChange(e.target.value)}
          options={Object.entries(RISK_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>
    </Card>
  );
}
