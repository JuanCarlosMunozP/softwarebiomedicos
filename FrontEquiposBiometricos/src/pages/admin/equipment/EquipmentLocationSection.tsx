import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { EquipmentSectionProps } from "@/types/equipment/props";
import { OWNER_OPTIONS } from "@/utils/equipment.utils";

export function EquipmentLocationSection({ form, setForm }: EquipmentSectionProps) {
  // Equipos guardados antes de que el propietario fuera una lista traen un texto
  // libre: se muestra tal cual (el backend lo sigue aceptando) para no perderlo.
  const legacyOwner =
    form.owner && !OWNER_OPTIONS.some((o) => o.value === form.owner)
      ? [{ value: form.owner, label: form.owner }]
      : [];
  return (
    <>
          <div className="sm:col-span-2 mt-2">
            <h3 className="text-sm font-semibold text-app">
              Información y ubicación
            </h3>
            <p className="text-xs text-app-muted">
              Datos generales y ubicación física del equipo.
            </p>
          </div>
          <Select
          label="Propietario"
          value={form.owner}
          onChange={(e) =>
            setForm({
              ...form,
              owner:e.target.value
            })
          }
          options={[...legacyOwner, ...OWNER_OPTIONS]}
          placeholder="Seleccione el propietario"
          />
          <Input
          label="Código de calibración"
          value={form.calibration_date}
          onChange={(e) =>
          setForm({
            ...form,
            calibration_date:e.target.value
            })
          }
          />
          <Input
          label="Fabricante"
          value={form.manufacturer}
          onChange={(e) =>
            setForm({
              ...form,
              manufacturer:e.target.value,
            })
          }
          />
          <Input
          label="Cliente"
          value={form.client_name}
          onChange={(e) =>
            setForm({
              ...form,
              client_name:e.target.value
            })
          }
          />
          <Input
          label="Marca/texto"
          value={form.branch_text}
          onChange={(e) => 
            setForm({
              ...form,
              branch_text:e.target.value,
            })
          }
          hint="Texto adicional asociado a la marca."
          />
          <Input
          label="Departamento"
          value={form.department}
          onChange={(e) =>
            setForm({
              ...form,
              department:e.target.value
            })
          }
          />
          <Input
          label="Ciudad"
          value={form.city}
          onChange={(e) =>
            setForm({
              ...form,
              city:e.target.value,
            })
          }
          />
          <Input
          label="Área"
          value={form.area}
          onChange={(e) => 
            setForm({
              ...form,
              area:e.target.value
            })
          }
          />
           <Input
            label="Ubicación"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            required
            className="sm:col-span-2"
          />
    </>
  );
}
