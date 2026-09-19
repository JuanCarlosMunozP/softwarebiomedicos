import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { UserHeaderProps } from "@/types/authentication/props";

export function UserHeader({
  canCreate,
  assignableRoles,
  openCreate,
}: UserHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-app">Usuarios</h1>
        <p className="text-sm text-app-muted">
          Administra los usuarios del sistema y sus roles.
        </p>
      </div>
      {canCreate && assignableRoles.length > 0 && (
        <Button leftIcon={<Plus size={16} />} onClick={openCreate}>
          Nuevo usuario
        </Button>
      )}
    </div>
  );
}
