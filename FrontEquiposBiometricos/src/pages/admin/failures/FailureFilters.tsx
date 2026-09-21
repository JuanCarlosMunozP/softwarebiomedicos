import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { FailureFiltersProps } from "@/types/failure/props";
import { SEV_LABEL } from "@/utils/failure.utils";

export function FailureFilters({
  search,
  setSearch,
  severityFilter,
  setSeverityFilter,
  resolvedFilter,
  setResolvedFilter,
  branchFilter,
  setBranchFilter,
  branchOptions,
}: FailureFiltersProps) {
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-5">
      <Input
        placeholder="Buscar..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Select
        placeholder="Toda severidad"
        value={severityFilter}
        onChange={(e) => setSeverityFilter(e.target.value)}
        options={Object.entries(SEV_LABEL).map(([value, label]) => ({
          value,
          label,
        }))}
      />
      <Select
        placeholder="Todos"
        value={resolvedFilter}
        onChange={(e) => setResolvedFilter(e.target.value)}
        options={[
          { value: "false", label: "Sin resolver" },
          { value: "true", label: "Resueltas" },
        ]}
      />
      <Select 
      placeholder="Todas las sedes "
      value={branchFilter}
      onChange={(e) => setBranchFilter(e.target.value)}
      options={branchOptions}
      />
    </div>
  );
}
