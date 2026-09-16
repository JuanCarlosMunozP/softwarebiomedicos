import { useEffect, useImperativeHandle, useMemo, useState, forwardRef } from "react";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { brandsService } from "@/services/brands.service";
import { modelsService } from "@/services/models.service";
import { getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { can } from "@/lib/permissions";
import type { Brand, BrandInput, EquipmentModel, ModelInput } from "@/types/brand";

const PAGE_SIZE = 6;

interface Props {
  // Permite que el componente padre se entere de cambios y refresque sus
  // selects (por ejemplo el formulario de equipos).
  onChanged?: (created?: { brand?: Brand; model?: EquipmentModel }) => void;
}

export interface MarcasModelosPanelHandle {
  openCreateBrand: () => void;
  openCreateModel: (brandId?: number) => void;
}

export const MarcasModelosPanel = forwardRef<MarcasModelosPanelHandle, Props>(
  function MarcasModelosPanel({ onChanged }, ref) {
  const { usuario } = useAuth();
  const role = usuario?.role;
  const canEdit = can(role, "equipment", "edit");
  const canDelete = can(role, "equipment", "delete");

  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandCount, setBrandCount] = useState(0);
  const [brandPage, setBrandPage] = useState(1);
  const [brandLoading, setBrandLoading] = useState(true);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [brandNameFilter, setBrandNameFilter] = useState("");
  const [brandStatusFilter, setBrandStatusFilter] = useState("");

  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [modelCount, setModelCount] = useState(0);
  const [modelPage, setModelPage] = useState(1);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelNameFilter, setModelNameFilter] = useState("");
  const [modelStatusFilter, setModelStatusFilter] = useState("");
  const [modelBrandFilter, setModelBrandFilter] = useState("");

  const [creatingBrand, setCreatingBrand] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandForm, setBrandForm] = useState<BrandInput>({
    name: "",
    is_active: true,
  });
  const [savingBrand, setSavingBrand] = useState(false);
  const [creatingModel, setCreatingModel] = useState(false);
  const [editingModel, setEditingModel] = useState<EquipmentModel | null>(null);
  const [modelForm, setModelForm] = useState<ModelInput>({
    name: "",
    brand: 0,
    is_active: true,
  });
  const [savingModel, setSavingModel] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [deletingBrand, setDeletingBrand] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<EquipmentModel | null>(null);
  const [deletingModel, setDeletingModel] = useState(false);
  const [togglingBrandId, setTogglingBrandId] = useState<number | null>(null);
  const [togglingModelId, setTogglingModelId] = useState<number | null>(null);

  const loadAllBrands = async () => {
    try {
      setAllBrands(await brandsService.listAll({ ordering: "name" }));
    } catch {
      // El listado paginado sigue funcionando aunque falle el select.
    }
  };

  const loadBrands = async (
    targetPage = brandPage,
    opts?: { name?: string; status?: string },
  ) => {
    const name = opts && "name" in opts ? opts.name : brandNameFilter;
    const status = opts && "status" in opts ? opts.status : brandStatusFilter;
    setBrandLoading(true);
    setBrandError(null);
    try {
      const data = await brandsService.listPaginated({
        ordering: "name",
        search: name || undefined,
        is_active:
          status === "true" ? true : status === "false" ? false : undefined,
        page: targetPage,
        page_size: PAGE_SIZE,
      });
      setBrands(data.results);
      setBrandCount(data.count);
      setBrandPage(targetPage);
    } catch (err) {
      setBrandError(getApiErrorMessage(err, "No se pudieron cargar las marcas"));
    } finally {
      setBrandLoading(false);
    }
  };

  const loadModels = async (
    targetPage = modelPage,
    opts?: { brand?: string; name?: string; status?: string },
  ) => {
    const brand = opts && "brand" in opts ? opts.brand : modelBrandFilter;
    const name = opts && "name" in opts ? opts.name : modelNameFilter;
    const status = opts && "status" in opts ? opts.status : modelStatusFilter;
    setModelLoading(true);
    setModelError(null);
    try {
      const data = await modelsService.listPaginated({
        ordering: "name",
        brand: brand ? Number(brand) : undefined,
        name: name || undefined,
        is_active:
          status === "true" ? true : status === "false" ? false : undefined,
        page: targetPage,
        page_size: PAGE_SIZE,
      });
      setModels(data.results);
      setModelCount(data.count);
      setModelPage(targetPage);
    } catch (err) {
      setModelError(getApiErrorMessage(err, "No se pudieron cargar los modelos"));
    } finally {
      setModelLoading(false);
    }
  };

  useEffect(() => {
    void loadAllBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadBrands(1);
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandNameFilter, brandStatusFilter]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadModels(1);
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelNameFilter, modelBrandFilter, modelStatusFilter]);

  const closeBrandModal = () => {
    setCreatingBrand(false);
    setEditingBrand(null);
  };

  const closeModelModal = () => {
    setCreatingModel(false);
    setEditingModel(null);
  };

  const openCreateBrand = () => {
    setBrandForm({ name: "", is_active: true });
    setCreatingBrand(true);
  };

  const openCreateModel = (brandId?: number) => {
    const preferred = brandId
      ? allBrands.find((b) => b.id === brandId)
      : allBrands[0];
    setModelForm({
      name: "",
      brand: preferred?.id ?? 0,
      is_active: true,
    });
    setCreatingModel(true);
  };

  const openEditBrand = (b: Brand) => {
    setEditingBrand(b);
    setBrandForm({ name: b.name, is_active: b.is_active });
  };

  const openEditModel = (m: EquipmentModel) => {
    setEditingModel(m);
    setModelForm({
      name: m.name,
      brand: m.brand,
      is_active: m.is_active,
    });
  };

  const submitBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBrand(true);
    try {
      if (editingBrand) {
        await brandsService.update(editingBrand.id, { name: brandForm.name });
        closeBrandModal();
        await loadAllBrands();
        await loadBrands();
        await loadModels();
        onChanged?.();
      } else {
        const created = await brandsService.create({
          name: brandForm.name,
          is_active: true,
        });
        closeBrandModal();
        await loadAllBrands();
        await loadBrands(1);
        onChanged?.({ brand: created });
      }
    } catch (err) {
      alert(getApiErrorMessage(err, "Error al guardar la marca"));
    } finally {
      setSavingBrand(false);
    }
  };

  const submitModel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingModel(true);
    try {
      if (editingModel) {
        await modelsService.update(editingModel.id, {
          name: modelForm.name,
          brand: modelForm.brand,
        });
        closeModelModal();
        await loadModels();
        onChanged?.();
      } else {
        const created = await modelsService.create({
          name: modelForm.name,
          brand: modelForm.brand,
          is_active: true,
        });
        closeModelModal();
        setModelBrandFilter(String(created.brand));
        setModelNameFilter(created.name);
        setModelStatusFilter("");
        await loadModels(1, {
          brand: String(created.brand),
          name: created.name,
          status: "",
        });
        onChanged?.({ model: created });
      }
    } catch (err) {
      alert(getApiErrorMessage(err, "Error al guardar el modelo"));
    } finally {
      setSavingModel(false);
    }
  };

  const confirmDeleteBrand = async () => {
    if (!brandToDelete) return;
    setDeletingBrand(true);
    try {
      await brandsService.remove(brandToDelete.id);
      setBrandToDelete(null);
      await loadAllBrands();
      await loadBrands();
      await loadModels();
      onChanged?.();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo eliminar la marca"));
    } finally {
      setDeletingBrand(false);
    }
  };

  const confirmDeleteModel = async () => {
    if (!modelToDelete) return;
    setDeletingModel(true);
    try {
      await modelsService.remove(modelToDelete.id);
      setModelToDelete(null);
      await loadModels();
      onChanged?.();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo eliminar el modelo"));
    } finally {
      setDeletingModel(false);
    }
  };

  const changeBrandStatus = async (brand: Brand, is_active: boolean) => {
    if (is_active === brand.is_active) return;
    const previous = brand.is_active;
    setBrands((prev) =>
      prev.map((b) => (b.id === brand.id ? { ...b, is_active } : b)),
    );
    setAllBrands((prev) =>
      prev.map((b) => (b.id === brand.id ? { ...b, is_active } : b)),
    );
    setTogglingBrandId(brand.id);
    try {
      const updated = await brandsService.update(brand.id, { is_active });
      setBrands((prev) =>
        prev.map((b) => (b.id === brand.id ? { ...b, ...updated } : b)),
      );
      setAllBrands((prev) =>
        prev.map((b) => (b.id === brand.id ? { ...b, ...updated } : b)),
      );
      onChanged?.();
    } catch (err) {
      setBrands((prev) =>
        prev.map((b) => (b.id === brand.id ? { ...b, is_active: previous } : b)),
      );
      setAllBrands((prev) =>
        prev.map((b) => (b.id === brand.id ? { ...b, is_active: previous } : b)),
      );
      alert(getApiErrorMessage(err, "No se pudo actualizar el estado de la marca"));
    } finally {
      setTogglingBrandId(null);
    }
  };

  const changeModelStatus = async (m: EquipmentModel, is_active: boolean) => {
    if (is_active === m.is_active) return;
    const previous = m.is_active;
    setModels((prev) =>
      prev.map((it) => (it.id === m.id ? { ...it, is_active } : it)),
    );
    setTogglingModelId(m.id);
    try {
      const updated = await modelsService.update(m.id, { is_active });
      setModels((prev) =>
        prev.map((it) => (it.id === m.id ? { ...it, ...updated } : it)),
      );
      onChanged?.();
    } catch (err) {
      setModels((prev) =>
        prev.map((it) => (it.id === m.id ? { ...it, is_active: previous } : it)),
      );
      alert(getApiErrorMessage(err, "No se pudo actualizar el estado del modelo"));
    } finally {
      setTogglingModelId(null);
    }
  };

  const brandOptions = useMemo(
    () => allBrands.map((b) => ({ value: String(b.id), label: b.name })),
    [allBrands],
  );

  const brandColSpan = canEdit || canDelete ? 3 : 2;
  const modelColSpan = canEdit || canDelete ? 4 : 3;

  useImperativeHandle(ref, () => ({
    openCreateBrand,
    openCreateModel,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-app">Catálogo</h1>
        <p className="text-sm text-app-muted">Marcas y modelos</p>
      </div>

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

      <Modal
        open={creatingBrand || !!editingBrand}
        onClose={closeBrandModal}
        title={editingBrand ? "Editar marca" : "Nueva marca"}
        size="sm"
        nested
      >
        <form onSubmit={submitBrand} className="flex flex-col gap-4">
          <Input
            label="Nombre de la marca"
            value={brandForm.name}
            onChange={(e) =>
              setBrandForm({ ...brandForm, name: e.target.value })
            }
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeBrandModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={savingBrand}>
              {editingBrand ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={creatingModel || !!editingModel}
        onClose={closeModelModal}
        title={editingModel ? "Editar modelo" : "Nuevo modelo"}
        size="sm"
        nested
      >
        <form onSubmit={submitModel} className="flex flex-col gap-4">
          <Select
            label="Marca"
            value={modelForm.brand ? String(modelForm.brand) : ""}
            onChange={(e) =>
              setModelForm({ ...modelForm, brand: Number(e.target.value) })
            }
            options={brandOptions}
            required
          />
          <Input
            label="Nombre del modelo"
            value={modelForm.name}
            onChange={(e) =>
              setModelForm({ ...modelForm, name: e.target.value })
            }
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModelModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={savingModel}>
              {editingModel ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!brandToDelete}
        title="Eliminar marca"
        description={`¿Eliminar la marca "${brandToDelete?.name}"? Si tiene modelos asociados el backend lo rechazará.`}
        confirmText="Eliminar"
        danger
        loading={deletingBrand}
        onConfirm={confirmDeleteBrand}
        onClose={() => setBrandToDelete(null)}
      />
      <ConfirmDialog
        open={!!modelToDelete}
        title="Eliminar modelo"
        description={`¿Eliminar el modelo "${modelToDelete?.name}"? Si tiene equipos asociados el backend lo rechazará.`}
        confirmText="Eliminar"
        danger
        loading={deletingModel}
        onConfirm={confirmDeleteModel}
        onClose={() => setModelToDelete(null)}
      />
    </div>
  );
});

function CatalogPager({
  count,
  page,
  pageSize,
  loading,
  onPrev,
  onNext,
}: {
  count: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const start = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, count);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app px-4 py-3 text-xs text-app-muted">
      <p>
        {count === 0 ? "Sin resultados" : `Mostrando ${start}–${end} de ${count}`}
      </p>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<ChevronLeft size={14} />}
          disabled={page <= 1 || loading}
          onClick={onPrev}
        >
          Anterior
        </Button>
        <span className="px-2 text-app">
          {page} / {totalPages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          rightIcon={<ChevronRight size={14} />}
          disabled={page >= totalPages || loading}
          onClick={onNext}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}

function CatalogActiveSelect({
  value,
  disabled,
  activeLabel,
  inactiveLabel,
  onChange,
}: {
  value: boolean;
  disabled?: boolean;
  activeLabel: string;
  inactiveLabel: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <select
      value={value ? "true" : "false"}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === "true")}
      title="Cambiar estado"
      className={`appearance-none rounded-full border px-2.5 py-1 pr-6 text-xs font-medium outline-none transition focus:ring-2 focus:ring-[var(--color-primary)]/30 disabled:cursor-not-allowed disabled:opacity-60 ${
        value
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
          : "border-app bg-app-muted text-app-muted hover:bg-app-muted/70 dark:hover:bg-white/10 dark:hover:text-app"
      }`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 20 20' fill='currentColor'><path d='M5.5 7.5l4.5 4.5 4.5-4.5z'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 6px center",
      }}
    >
      <option value="true">{activeLabel}</option>
      <option value="false">{inactiveLabel}</option>
    </select>
  );
}
