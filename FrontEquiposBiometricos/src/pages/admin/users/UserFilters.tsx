import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ROLE_LABEL, ASSIGNABLE_ROLES } from "@/lib/permissions";
import type { UserFiltersProps } from "@/types/authentication/props";

export function UserFilters({
  search,
  setSearch,
  roleFilter,
  setRoleFilter,
}: UserFiltersProps) {
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2">
      <Input
        placeholder="Buscar usuario, correo..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Select
        placeholder="Todos los roles"
        value={roleFilter}
        onChange={(e) => setRoleFilter(e.target.value)}
        options={ASSIGNABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
      />
    </div>
  );
}
