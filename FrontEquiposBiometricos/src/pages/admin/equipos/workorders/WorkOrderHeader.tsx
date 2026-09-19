import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { WorkOrderHeaderProps } from "@/types/equipment/workorder-props";

export function WorkOrderHeader({
  isEngineer,
  canCreate,
  onCreate,
}: WorkOrderHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-app">
          {isEngineer ? "Tareas asignadas" : "Órdenes de trabajo"}
        </h1>
        <p className="text-sm text-app-muted">
          {isEngineer
            ? "Órdenes de trabajo que te asignaron. Realiza el mantenimiento para cerrarlas."
            : "Registro de intervenciones en equipos: repuestos, mediciones, evidencias, firmas y costos."}
        </p>
      </div>
      {canCreate && (
        <Button leftIcon={<Plus size={16} />} onClick={onCreate}>
          Nueva orden
        </Button>
      )}
    </div>
  );
}
