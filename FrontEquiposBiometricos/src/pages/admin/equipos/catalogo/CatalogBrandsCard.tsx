import { Boxes, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import type { CatalogBrandsCardProps } from "@/types/equipment/catalog-props";
import { CatalogActiveSelect } from "@/pages/admin/equipos/catalogo/CatalogActiveSelect";
import { CatalogPager } from "@/pages/admin/equipos/catalogo/CatalogPager";
import { PAGE_SIZE } from "@/utils/catalog.utils";

export function CatalogBrandsCard({
  brandNameFilter,
  setBrandNameFilter,
  brandStatusFilter,
  setBrandStatusFilter,
  brandError,
  brandLoading,
  brands,
  brandColSpan,
  canEdit,
  canDelete,
  togglingBrandId,
  changeBrandStatus,
  openEditBrand,
  setBrandToDelete,
  brandCount,
  brandPage,
  loadBrands,
}: CatalogBrandsCardProps) {
  return (
    <Card padding="none">
      <div className="border-b border-app px-4 py-3">
        <p className="text-sm font-semibold text-app">Marcas</p>
      </div>
      <div className="grid gap-2 border-b border-app px-4 py-3 sm:grid-cols-2">
        <Input
          placeholder="Nombre de la marca"
          value={brandNameFilter}
          onChange={(e) => setBrandNameFilter(e.target.value)}
        />
        <Select
          placeholder="Todos los estados"
          value={brandStatusFilter}
          onChange={(e) => setBrandStatusFilter(e.target.value)}
          options={[
            { value: "true", label: "Activa" },
            { value: "false", label: "Inactiva" },
          ]}
        />
      </div>
      {brandError && (
        <div
          role="alert"
          className="m-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {brandError}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted">
              <th className="px-4 py-3 font-medium">Marca</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              {(canEdit || canDelete) && (
                <th className="px-4 py-3 text-center font-medium">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {brandLoading ? (
              <tr>
                <td colSpan={brandColSpan} className="py-10 text-center text-app-muted">
                  Cargando...
                </td>
              </tr>
            ) : brands.length === 0 ? (
              <tr>
                <td colSpan={brandColSpan} className="py-10 text-center text-app-muted">
                  <div className="flex flex-col items-center gap-2">
                    <Boxes size={28} className="opacity-50" />
                    <p>No se encontraron marcas con los filtros actuales.</p>
                  </div>
                </td>
              </tr>
            ) : (
              brands.map((b) => (
                <tr key={b.id} className="text-app">
                  <td className="px-4 py-3">
                    <p className="font-medium">{b.name}</p>
                    {b.models_count != null && (
                      <p className="text-xs text-app-muted">
                        {b.models_count} modelos
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <CatalogActiveSelect
                        value={b.is_active}
                        disabled={togglingBrandId === b.id}
                        activeLabel="Activa"
                        inactiveLabel="Inactiva"
                        onChange={(next) => void changeBrandStatus(b, next)}
                      />
                    ) : b.is_active ? (
                      <Badge tone="success">Activa</Badge>
                    ) : (
                      <Badge tone="neutral">Inactiva</Badge>
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
                            onClick={() => openEditBrand(b)}
                          >
                            Editar
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="danger"
                            leftIcon={<Trash2 size={14} />}
                            onClick={() => setBrandToDelete(b)}
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
        count={brandCount}
        page={brandPage}
        pageSize={PAGE_SIZE}
        loading={brandLoading}
        onPrev={() => void loadBrands(Math.max(1, brandPage - 1))}
        onNext={() =>
          void loadBrands(
            Math.min(Math.max(1, Math.ceil(brandCount / PAGE_SIZE)), brandPage + 1),
          )
        }
      />
    </Card>
  );
}
