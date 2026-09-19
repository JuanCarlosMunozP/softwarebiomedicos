import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { NEW_BRAND_VALUE, NEW_MODEL_VALUE, RISK_LABEL } from "@/utils/equipment.utils";
import type { RiskClass } from "@/types/equipment/equipment";
import type { EquipmentClassificationSectionProps } from "@/types/equipment/props";

export function EquipmentClassificationSection({
  form,
  setForm,
  branchOptions,
  brands,
  brandOptions,
  models,
  modelsForForm,
  modelOptionsForm,
  openCatalogForm,
}: EquipmentClassificationSectionProps) {
  return (
    <>
          <div className="sm:col-span-2 mt-2">
            <h3 className="text-sm font-semibold text-app">
              Clasificación y catálogo
            </h3>
            <p className="text-xs text-app-muted">
              Catálogo, tecnología y clasificación biomédica
            </p>
          </div>
          <Select
            label="Sede"
            value={String(form.branch)}
            onChange={(e) =>
              setForm({ ...form, branch: Number(e.target.value) })
            }
            options={branchOptions}
            placeholder="Selecciona una sede"
            required
          />
          <Select
            label="Marca"
            value={String(form.brand)}
            onChange={(e) => {
              if (e.target.value === NEW_BRAND_VALUE) {
                openCatalogForm("brand");
                return;
              }
              const brandId = Number(e.target.value);
              const brandModels = models.filter(
                (m) => m.brand === brandId && m.is_active,
              );
              setForm({
                ...form,
                brand: brandId,
                equipment_model:
                  brandModels.length === 1 ? brandModels[0].id : 0,
              });
            }}
            options={brandOptions}
            placeholder="Selecciona una marca"
            required
            hint={
              brands.filter((b) => b.is_active || b.id === form.brand).length === 0
                ? "Crea una marca primero con la opción Nueva marca."
                : undefined
            }
          />
          <Select
            label="Modelo"
            value={String(form.equipment_model)}
            onChange={(e) => {
              if (e.target.value === NEW_MODEL_VALUE) {
                openCatalogForm("model", form.brand);
                return;
              }
              setForm({ ...form, equipment_model: Number(e.target.value) });
            }}
            options={modelOptionsForm}
            placeholder={
              !form.brand
                ? "Selecciona una marca primero"
                : modelsForForm.filter(
                    (m) => m.is_active || m.id === form.equipment_model,
                  ).length === 0
                  ? "No hay modelos para esta marca"
                  : "Selecciona un modelo"
            }
            disabled={!form.brand}
            required
          />
          <Select
          label="Tipo de tecnología"
          value={form.technology_type}
          onChange={(e) =>
            setForm({
              ...form,
              technology_type:e.target.value,
            })
          }
          options={[
            {value:"ELECTRONIC",label:"Electrónico"},
            {value:"ELECTROMEDICAL",label:"Electromédico"},
            {value:"MECHANICAL",label:"Mecánico"},
            {value:"MIXED",label:"Mixto"},
            {value:"OTHER",label:"Otro"},
          ]}
          placeholder="Seleccione el tipo"
          />
          <Input
          label="Clasificación biomédica"
          value={form.biomedical_classification}
          onChange={(e) =>
            setForm({
              ...form,
              biomedical_classification: e.target.value,
            })
          }
          hint="Clasificación utilizada para el equipo."
          />
          <Select
            label="Clase de riesgo"
            value={form.risk_class}
            onChange={(e) =>
              setForm({ ...form, risk_class: e.target.value as RiskClass })
            }
            options={Object.entries(RISK_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
            required
            hint="Clasificación INVIMA / FDA del dispositivo médico."
          />
    </>
  );
}
