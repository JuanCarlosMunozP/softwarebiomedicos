import { useEffect, useImperativeHandle, useMemo, useState, forwardRef } from "react";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Layers,
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
import { useAuth } from "@/context/AuthContext";
import { can } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
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
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [modelCount, setModelCount] = useState(0);
  const [modelPage, setModelPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [brandNameFilter, setBrandNameFilter] = useState("");
  const [modelNameFilter, setModelNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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
  const [fichaTarget, setFichaTarget] = useState<EquipmentModel | null>(null);

  const loadAllBrands = async () => {
    try {
      setAllBrands(await brandsService.listAll({ ordering: "name" }));
    } catch {
      // El listado de modelos sigue funcionando aunque falle el filtro.
    }
  };

  const loadModels = async (
    targetPage = modelPage,
    opts?: { brandName?: string; modelName?: string; status?: string },
  ) => {
    const brandName =
      opts && "brandName" in opts ? opts.brandName : brandNameFilter;
    const modelName =
      opts && "modelName" in opts ? opts.modelName : modelNameFilter;
    const status = opts && "status" in opts ? opts.status : statusFilter;
    setLoading(true);
    setError(null);
    try {
      const data = await modelsService.listPaginated({
        ordering: "name",
        brand_name: brandName || undefined,
        name: modelName || undefined,
        is_active:
          status === "true" ? true : status === "false" ? false : undefined,
        page: targetPage,
        page_size: PAGE_SIZE,
      });
      setModels(data.results);
      setModelCount(data.count);
      setModelPage(targetPage);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron cargar los modelos"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAllBrands();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void loadModels(1), 250);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandNameFilter, modelNameFilter, statusFilter]);

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

  const openEditModel = (m: EquipmentModel) => {
    setFichaTarget(null);
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
        await brandsService.update(editingBrand.id, brandForm);
        closeBrandModal();
        await loadAllBrands();
        await loadModels();
        onChanged?.();
      } else {
        const created = await brandsService.create(brandForm);
        closeBrandModal();
        await loadAllBrands();
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
        await modelsService.update(editingModel.id, modelForm);
        closeModelModal();
        await loadModels();
        onChanged?.();
      } else {
        const created = await modelsService.create(modelForm);
        closeModelModal();
        setBrandNameFilter(created.brand_name ?? "");
        setModelNameFilter(created.name);
        setStatusFilter("");
        await loadModels(1, {
          brandName: created.brand_name ?? "",
          modelName: created.name,
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
      setFichaTarget(null);
      await loadModels();
      onChanged?.();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo eliminar el modelo"));
    } finally {
      setDeletingModel(false);
    }
  };

  const brandOptions = useMemo(
    () => allBrands.map((b) => ({ value: String(b.id), label: b.name })),
    [allBrands],
  );

  const brandOf = (m: EquipmentModel) =>
    allBrands.find((b) => b.id === m.brand);

  const modelTotalPages = Math.max(1, Math.ceil(modelCount / PAGE_SIZE));
  const start = modelCount === 0 ? 0 : (modelPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(modelPage * PAGE_SIZE, modelCount);

  useImperativeHandle(ref, () => ({
    openCreateBrand,
    openCreateModel,
  }));

  return (
    <Card padding="none">
      <div className="flex items-center gap-2 border-b border-app px-4 py-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <Layers size={16} />
        </span>
        <div>
          <p className="text-sm font-semibold text-app">
            Catálogo de marcas y modelos
          </p>
          <p className="text-xs text-app-muted">
            {allBrands.length} marcas · {modelCount} modelos
          </p>
        </div>
      </div>

      <div className="grid gap-2 border-b border-app px-4 py-3 sm:grid-cols-3">
        <Input
          placeholder="Nombre de la marca"
          value={brandNameFilter}
          onChange={(e) => setBrandNameFilter(e.target.value)}
        />
        <Input
          placeholder="Nombre del modelo"
          value={modelNameFilter}
          onChange={(e) => setModelNameFilter(e.target.value)}
        />
        <Select
          placeholder="Todos los estados"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "true", label: "Activo" },
            { value: "false", label: "Inactivo" },
          ]}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="m-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted">
              <th className="px-4 py-3 font-medium">Marca</th>
              <th className="px-4 py-3 font-medium">Modelo</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-app-muted">
                  Cargando...
                </td>
              </tr>
            ) : allBrands.length === 0 && models.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-app-muted">
                  <div className="flex flex-col items-center gap-2">
                    <Boxes size={28} className="opacity-50" />
                    <p>Aún no hay marcas. Crea la primera para empezar.</p>
                  </div>
                </td>
              </tr>
            ) : models.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-app-muted">
                  No se encontraron modelos con los filtros actuales.
                </td>
              </tr>
            ) : (
              models.map((m) => {
                const brand = brandOf(m);
                return (
                  <tr
                    key={m.id}
                    onClick={() => setFichaTarget(m)}
                    className="cursor-pointer text-app transition hover:bg-app-muted/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">
                          {m.brand_name ?? brand?.name ?? `Marca #${m.brand}`}
                        </span>
                        {brand && !brand.is_active && (
                          <Badge tone="neutral">Inactiva</Badge>
                        )}
                      </div>
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
                      {m.is_active ? (
                        <Badge tone="success">Activo</Badge>
                      ) : (
                        <Badge tone="neutral">Inactivo</Badge>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app px-4 py-3 text-xs text-app-muted">
        <p>
          {modelCount === 0
            ? "Sin resultados"
            : `Mostrando ${start}–${end} de ${modelCount}`}
        </p>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<ChevronLeft size={14} />}
            disabled={modelPage <= 1 || loading}
            onClick={() => void loadModels(Math.max(1, modelPage - 1))}
          >
            Anterior
          </Button>
          <span className="px-2 text-app">
            {modelPage} / {modelTotalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            rightIcon={<ChevronRight size={14} />}
            disabled={modelPage >= modelTotalPages || loading}
            onClick={() =>
              void loadModels(Math.min(modelTotalPages, modelPage + 1))
            }
          >
            Siguiente
          </Button>
        </div>
      </div>

      <Modal
        open={
          !!fichaTarget &&
          !creatingBrand &&
          !creatingModel &&
          !editingBrand &&
          !editingModel
        }
        onClose={() => setFichaTarget(null)}
        title={
          fichaTarget
            ? (fichaTarget.brand_name ??
              brandOf(fichaTarget)?.name ??
              "Marca")
            : "Catálogo"
        }
        size="xs"
        nested
      >
        {fichaTarget && (
          <div className="flex flex-col gap-3">
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-xs text-app-muted">Marca</dt>
                <dd className="font-medium text-app">
                  {fichaTarget.brand_name ??
                    brandOf(fichaTarget)?.name ??
                    `Marca #${fichaTarget.brand}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-app-muted">Modelo</dt>
                <dd className="font-medium text-app">{fichaTarget.name}</dd>
              </div>
            </dl>
            {(canEdit || canDelete) && (
              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    variant="secondary"
                    leftIcon={<Pencil size={12} />}
                    onClick={() => openEditModel(fichaTarget)}
                  >
                    Editar
                  </Button>
                )}
                {canDelete && (
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    variant="danger"
                    leftIcon={<Trash2 size={12} />}
                    onClick={() => setModelToDelete(fichaTarget)}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

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
          <label className="flex items-center gap-2 text-sm text-app">
            <input
              type="checkbox"
              checked={brandForm.is_active}
              onChange={(e) =>
                setBrandForm({ ...brandForm, is_active: e.target.checked })
              }
            />
            Marca activa
          </label>
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
          <label className="flex items-center gap-2 text-sm text-app">
            <input
              type="checkbox"
              checked={modelForm.is_active}
              onChange={(e) =>
                setModelForm({ ...modelForm, is_active: e.target.checked })
              }
            />
            Activo
          </label>
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
    </Card>
  );
});
