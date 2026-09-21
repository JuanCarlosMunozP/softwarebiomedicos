import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EquipoFicha } from "@/pages/admin/equipment/EquipoFicha";
import { EquipmentHeader } from "@/pages/admin/equipment/EquipmentHeader";
import { EquipmentFilters } from "@/pages/admin/equipment/EquipmentFilters";
import { EquipmentTable } from "@/pages/admin/equipment/EquipmentTable";
import { EquipmentPagination } from "@/pages/admin/equipment/EquipmentPagination";
import { EquipmentFormModal } from "@/pages/admin/equipment/EquipmentFormModal";
import { MarcasModelosPanel } from "@/pages/admin/equipment/catalog/MarcasModelosPanel";
import type { MarcasModelosPanelHandle } from "@/pages/admin/equipment/catalog/MarcasModelosPanel";
import { useAuth } from "@/context/AuthContext";
import { equipmentService } from "@/services/equipment.service";
import { branchesService } from "@/services/branches.service";
import { brandsService } from "@/services/brands.service";
import { modelsService } from "@/services/models.service";
import { can } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
import { NEW_BRAND_VALUE, NEW_MODEL_VALUE, PAGE_SIZE, empty } from "@/utils/equipment.utils";
import type { Branch } from "@/types/equipment/branch";
import type { Brand, EquipmentModel } from "@/types/equipment/brand";
import type { Equipment, EquipmentInput, EquipmentStatus } from "@/types/equipment/equipment";
import type { FormState } from "@/types/equipment/form";
import { equipmentToForm, formToPayload } from "@/utils/equipment.form.utils";


export function EquiposPage() {
  const { usuario } = useAuth();
  const role = usuario?.role;
  const navigate = useNavigate();

  const [items, setItems] = useState<Equipment[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [branchFilter, setBranchFilter] = useState<string>("");
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [riskFilter, setRiskFilter] = useState<string>("");

  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  const [editing, setEditing] = useState<Equipment | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formErrorRef = useRef<HTMLDivElement | null>(null);
  const catalogPanelRef = useRef<MarcasModelosPanelHandle | null>(null);

  const [toDelete, setToDelete] = useState<Equipment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [fichaTarget, setFichaTarget] = useState<Equipment | null>(null);

  const canCreate = can(role, "equipment", "create");
  const canEdit = can(role, "equipment", "edit");
  const canDelete = can(role, "equipment", "delete");
  const canCreateMaintenance = can(role, "maintenance", "create");

  const branchOptions = useMemo(
    () => branches.map((b) => ({ value: String(b.id), label: b.name })),
    [branches],
  );

  const brandOptions = useMemo(() => {
    const opts = brands
      .filter((b) => b.is_active || b.id === form.brand)
      .map((b) => ({ value: String(b.id), label: b.name }));
    if (canCreate) {
      opts.unshift({ value: NEW_BRAND_VALUE, label: "Nueva marca" });
    }
    return opts;
  }, [brands, form.brand, canCreate]);

  // Modelos disponibles para la marca seleccionada en el formulario.
  const modelsForForm = useMemo(
    () => models.filter((m) => m.brand === form.brand),
    [models, form.brand],
  );

  const modelOptionsForm = useMemo(() => {
    const opts = modelsForForm
      .filter((m) => m.is_active || m.id === form.equipment_model)
      .map((m) => ({ value: String(m.id), label: m.name }));
    if (canCreate && form.brand) {
      opts.unshift({ value: NEW_MODEL_VALUE, label: "Nuevo modelo" });
    }
    return opts;
  }, [modelsForForm, form.equipment_model, canCreate, form.brand]);

  const branchName = (id: number) =>
    branches.find((b) => b.id === id)?.name ?? `Sede #${id}`;

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  // Buscar la marca del modelo (a partir de equipment_model).
  const resolveBrandIdOfModel = (modelId: number): number => {
    const m = models.find((x) => x.id === modelId);
    return m?.brand ?? 0;
  };

  // ---- Carga datos auxiliares ----
  const loadCatalog = async () => {
    try {
      // listAll, no list: con más de una página de marcas/modelos, list()
      // solo trae la primera y el resto falta en los <Select> del formulario.
      const [bs, ms] = await Promise.all([
        brandsService.listAll({ ordering: "name" }),
        modelsService.listAll({ ordering: "name" }),
      ]);
      setBrands(bs);
      setModels(ms);
    } catch {
      // No es crítico — el resto de la página sigue funcionando.
    }
  };

  useEffect(() => {
    branchesService
      .list({ ordering: "name" })
      .then(setBranches)
      .catch(() => null);
    void loadCatalog();
  }, []);

  // ---- Carga equipos paginados ----
  const load = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const data = await equipmentService.listPaginated({
        ordering: "name",
        search: search || undefined,
        status: statusFilter || undefined,
        branch: branchFilter ? Number(branchFilter) : undefined,
        brand: brandFilter ? Number(brandFilter) : undefined,
        risk_class: riskFilter || undefined,
        page: targetPage,
        page_size: PAGE_SIZE,
      });
      setItems(data.results);
      setCount(data.count);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron cargar los equipos"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, branchFilter, brandFilter, riskFilter]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load(page);
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, branchFilter, brandFilter, riskFilter, page]);

  // Al aparecer un error en el formulario, lo traemos a la vista: si no,
  // queda arriba mientras el usuario mira la parte de abajo del modal.
  useEffect(() => {
    if (formError) {
      formErrorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [formError]);

  // ---- CRUD equipo ----
  const openCreate = () => {
    const brand = brands.find((b) => b.is_active)?.id ?? brands[0]?.id ?? 0;
    const brandModels = models.filter((m) => m.brand === brand && m.is_active);
    setForm({
      ...empty,
      branch: branches[0]?.id ?? 0,
      brand,
      // Si la marca por defecto tiene un solo modelo, lo dejamos elegido para
      // que no sea un campo obligatorio "invisible" que bloquea el guardado.
      equipment_model: brandModels.length === 1 ? brandModels[0].id : 0,
    });
    setFormError(null);
    setCreating(true);
  };

  const openEdit = (e: Equipment) => {
    const inferredBrand =
      e.brand ?? resolveBrandIdOfModel(e.equipment_model) ?? 0;
    setForm(equipmentToForm(e, inferredBrand));
    setFormError(null);
    setEditing(e);
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
    setForm(empty);
    setFormError(null);
  };

  const openCatalogForm = (kind: "brand" | "model", brandId?: number) => {
    if (kind === "brand") {
      catalogPanelRef.current?.openCreateBrand();
    } else {
      catalogPanelRef.current?.openCreateModel(brandId);
    }
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();

    // Validación explícita: los campos obligatorios que están arriba en el
    // formulario quedaban ocultos al hacer scroll y el navegador bloqueaba
    // el envío sin que se viera por qué. Ahora lo decimos claramente.
    if (
      models.length > 0 &&
      form.brand &&
      modelsForForm.filter(
        (m) => m.is_active || m.id === form.equipment_model,
      ).length === 0
    ) {
      setFormError(
        "La marca seleccionada no tiene modelos. Crea uno con la opción Nuevo modelo y vuelve a intentarlo.",
      );
      return;
    }
    const missing: string[] = [];
    if (!form.name.trim()) missing.push("Nombre");
    if (!form.asset_tag.trim()) missing.push("Asset tag");
    if (!form.branch) missing.push("Sede");
    if (!form.brand) missing.push("Marca");
    if (!form.equipment_model) missing.push("Modelo");
    if (!form.location.trim()) missing.push("Ubicación");
    if (!form.purchase_date) missing.push("Fecha de compra");
    if (missing.length) {
      setFormError(`Faltan campos obligatorios: ${missing.join(", ")}.`);
      return;
    }

    setFormError(null);
    setSaving(true);

    // El campo brand del form es sólo UI; el backend deriva la marca del
    // modelo. Se excluye del payload.
    const payload: EquipmentInput = formToPayload(form);

    try {
      if (editing) {
        await equipmentService.update(editing.id, payload);
      } else {
        await equipmentService.create(payload);
      }
      closeModal();
      await load(page);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Error al guardar"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await equipmentService.remove(toDelete.id);
      setToDelete(null);
      setFichaTarget(null);
      await load(page);
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo eliminar"));
    } finally {
      setDeleting(false);
    }
  };

  const changeStatus = async (eq: Equipment, status: EquipmentStatus) => {
    if (status === eq.status) return;
    const previous = eq.status;
    // Update optimista
    setItems((prev) =>
      prev.map((it) => (it.id === eq.id ? { ...it, status } : it)),
    );
    setStatusUpdatingId(eq.id);
    try {
      const updated = await equipmentService.update(eq.id, { status });
      setItems((prev) =>
        prev.map((it) => (it.id === eq.id ? { ...it, ...updated } : it)),
      );
    } catch (err) {
      // Revertir
      setItems((prev) =>
        prev.map((it) => (it.id === eq.id ? { ...it, status: previous } : it)),
      );
      alert(getApiErrorMessage(err, "No se pudo actualizar el estado"));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const start = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, count);

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-6">
      <EquipmentHeader
        canCreate={canCreate}
        onCreate={openCreate}
        role={role}
        area={usuario?.area}
      />

      <EquipmentFilters
        search={search}
        onSearchChange={setSearch}
        branchFilter={branchFilter}
        onBranchFilterChange={setBranchFilter}
        brandFilter={brandFilter}
        onBrandFilterChange={setBrandFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        riskFilter={riskFilter}
        onRiskFilterChange={setRiskFilter}
        branchOptions={branchOptions}
        brands={brands}
      />

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </div>
          )}

      <Card padding="none">
        <EquipmentTable
          items={items}
          loading={loading}
          brands={brands}
          models={models}
          branchName={branchName}
          canEdit={canEdit}
          canCreateMaintenance={canCreateMaintenance}
          statusUpdatingId={statusUpdatingId}
          onSelect={setFichaTarget}
          onChangeStatus={(eq, status) => void changeStatus(eq, status)}
          onNewMaintenance={(eq) =>
            navigate(`/admin/mantenimientos?equipment=${eq.id}`)
          }
        />

        <EquipmentPagination
          count={count}
          start={start}
          end={end}
          page={page}
          totalPages={totalPages}
          loading={loading}
          setPage={setPage}
        />
      </Card>

      {canCreate && (
        <MarcasModelosPanel
          ref={catalogPanelRef}
          onChanged={(created) => {
            void loadCatalog().then(() => {
              if (created?.brand) {
                setForm((f) => ({
                  ...f,
                  brand: created.brand.id,
                  equipment_model: 0,
                }));
              } else if (created?.model) {
                setForm((f) => ({
                  ...f,
                  brand: created.model.brand,
                  equipment_model: created.model.id,
                }));
              }
            });
          }}
        />
      )}

      <EquipmentFormModal
        open={creating || !!editing}
        onClose={closeModal}
        editing={editing}
        formError={formError}
        formErrorRef={formErrorRef}
        onSubmit={submit}
        saving={saving}
        form={form}
        setForm={setForm}
        branchOptions={branchOptions}
        brands={brands}
        brandOptions={brandOptions}
        models={models}
        modelsForForm={modelsForForm}
        modelOptionsForm={modelOptionsForm}
        openCatalogForm={openCatalogForm}
      />

      <EquipoFicha
        open={!!fichaTarget && !editing && !creating}
        equipment={fichaTarget}
        onClose={() => setFichaTarget(null)}
        branchName={branchName}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={(eq) => {
          setFichaTarget(null);
          openEdit(eq);
        }}
        onDelete={(eq) => setToDelete(eq)}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar equipo"
        description={`¿Eliminar el equipo "${toDelete?.name}"? Esta acción borrará también el QR.`}
        confirmText="Eliminar"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
