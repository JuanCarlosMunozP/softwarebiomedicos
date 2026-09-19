import { Button } from "@/components/ui/Button";
import type { SchedulingHeaderProps } from "@/types/agendamientos/props";
import { Plus } from "lucide-react";

export function SchedulingHeader({canCreate,onCreate}:SchedulingHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-app">
          Solicitudes
        </h1>
        <p>
          Solicitudes de mantenimiento. La programación de mantenimiento y la asignación de 
          responsable se hacen después, al editar cada solicitud.
        </p>
        {canCreate && (
          <Button leftIcon={<Plus size={16}/>} onClick={onCreate}>
            Nueva Solicitud
          </Button>
        )}
      </div>
    </div>
  )
}