import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { EquipmentHeaderProps } from "@/types/equipment/props";

export function EquipmentHeader({
  canCreate,
  onCreate,
  role,
  area,
}: EquipmentHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-app">Inventario</h1>
        <p className="text-sm text-app-muted">
          {role === "tecnico"
            ? `Equipos de tu área${area ? ` (${area})` : ""}. Consulta e informa fallas observadas.`
            : "Inventario de equipos"}
        </p>
      </div>
      {canCreate && (
        <Button leftIcon={<Plus size={16} />} onClick={onCreate}>
          Nuevo equipo
        </Button>
      )}
    </div>
  );
}
