import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import type { CatalogModelsCardProps } from "@/types/equipment/catalog-props";
import { CatalogActiveSelect } from "@/pages/admin/equipos/catalogo/CatalogActiveSelect";
import { CatalogPager } from "@/pages/admin/equipos/catalogo/CatalogPager";
import { PAGE_SIZE } from "@/utils/catalog.utils";

export function CatalogModelsCard({
  modelNameFilter,
  setModelNameFilter,
  modelBrandFilter,
  setModelBrandFilter,
  brandOptions,
  modelStatusFilter,
  setModelStatusFilter,
  modelError,
  modelLoading,
  models,
  modelColSpan,
  canEdit,
  canDelete,
  togglingModelId,
  changeModelStatus,
  openEditModel,
  setModelToDelete,
  modelCount,
  modelPage,
  loadModels,
}: CatalogModelsCardProps) {
  return (
    <Card padding="none">
      <div className="border-b border-app px-4 py-3">
        <p className="text-sm font-semibold text-app">Modelos</p>
      </div>
      <div className="grid gap-2 border-b border-app px-4 py-3 sm:grid-cols-3">
        <Input
          placeholder="Nombre del modelo"
          value={modelNameFilter}
          onChange={(e) => setModelNameFilter(e.target.value)}
        />
        <Select
          placeholder="Todas las marcas"
          value={modelBrandFilter}
          onChange={(e) => setModelBrandFilter(e.target.value)}
          options={brandOptions}
        />
        <Select
          placeholder="Todos los estados"
          value={modelStatusFilter}
          onChange={(e) => setModelStatusFilter(e.target.value)}
          options={[
            { value: "true", label: "Activo" },
            { value: "false", label: "Inactivo" },
          ]}
        />
      </div>
      {modelError && (
        <div
          role="alert"
          className="m-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {modelError}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted">
              <th className="px-4 py-3 font-medium">Marca</th>
              <th className="px-4 py-3 font-medium">Modelo</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              {(canEdit || canDelete) && (
                <th className="px-4 py-3 text-center font-medium">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {modelLoading ? (
              <tr>
                <td colSpan={modelColSpan} className="py-10 text-center text-app-muted">
                  Cargando...
                </td>
              </tr>
            ) : models.length === 0 ? (
              <tr>
                <td colSpan={modelColSpan} className="py-10 text-center text-app-muted">
                  No se encontraron modelos con los filtros actuales.
                </td>
              </tr>
            ) : (
              models.map((m) => (
                <tr key={m.id} className="text-app">
                  <td className="px-4 py-3 font-medium">
                    {m.brand_name ?? `Marca #${m.brand}`}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{m.name}</p>
                    {m.equipment_count != null && (
                      <p className="text-xs text-app-muted">
                        {m.equipment_count} equipos asociados
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <CatalogActiveSelect
                        value={m.is_active}
                        disabled={togglingModelId === m.id}
                        activeLabel="Activo"
                        inactiveLabel="Inactivo"
                        onChange={(next) => void changeModelStatus(m, next)}
                      />
                    ) : m.is_active ? (
                      <Badge tone="success">Activo</Badge>
                    ) : (
                      <Badge tone="neutral">Inactivo</Badge>
                    )}
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<Pencil size={14} />}
                            onClick={() => openEditModel(m)}
                          >
                            Editar
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="danger"
                            leftIcon={<Trash2 size={14} />}
                            onClick={() => setModelToDelete(m)}
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <CatalogPager
        count={modelCount}
        page={modelPage}
        pageSize={PAGE_SIZE}
        loading={modelLoading}
        onPrev={() => void loadModels(Math.max(1, modelPage - 1))}
        onNext={() =>
          void loadModels(
            Math.min(Math.max(1, Math.ceil(modelCount / PAGE_SIZE)), modelPage + 1),
          )
        }
      />
    </Card>
  );
}
