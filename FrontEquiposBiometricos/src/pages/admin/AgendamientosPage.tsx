import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TechnicianSelect } from "@/components/ui/TechnicianSelect";
import { assignedUserName, assignmentPayload } from "@/lib/users";
import { useAuth } from "@/context/AuthContext";
import { schedulingService } from "@/services/scheduling.service";
import { equipmentService } from "@/services/equipment.service";
import { usersService } from "@/services/users.service";
import { workOrdersService } from "@/services/workorders.service";
import { can } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
import type { Equipment } from "@/types/equipment";
import type { Usuario } from "@/types/auth";
import type {
  ScheduleKind,
  ScheduledMaintenance,
} from "@/types/scheduling";
import type { WorkOrderDetail } from "@/types/workorder";

const TECHNICIAN_ROLES = ["tecnico", "ingeniero"];

const KIND_LABEL: Record<ScheduleKind, string> = {
  PREVENTIVE: "Preventivo",
  REPAIR: "Reparación",
};

function scheduleEstado(s: ScheduledMaintenance): {
  label: string;
  tone: "success" | "info" | "warning";
} {
  if (s.is_completed || s.work_order?.status === "FINISHED") {
    return { label: "Cumplida", tone: "success" };
  }
  if (s.work_order?.status === "IN_PROGRESS") {
    return { label: "En proceso", tone: "info" };
  }
  return { label: "Pendiente", tone: "warning" };
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

const today = () => new Date().toISOString().slice(0, 10);
const PAGE_SIZE = 20;

interface FormState {
  equipment: number;
  kind: ScheduleKind;
  requested_date: string;
  scheduled_date: string;
  notes: string;
  assigned_technician: number | null;
  assigned_engineer: number | null;
}

const empty: FormState = {
  equipment: 0,
  kind: "PREVENTIVE",
  requested_date: today(),
  scheduled_date: "",
  notes: "",
  assigned_technician: null,
  assigned_engineer: null,
};

export function AgendamientosPage() {
  const { usuario } = useAuth();
  const role = usuario?.role;
  const navigate = useNavigate();

  const [items, setItems] = useState<ScheduledMaintenance[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  // La lista de equipos se carga aparte y en silencio; si falla, avisamos en
  // el <Select> del formulario para que no quede un desplegable vacío sin
  // explicación.
  const [equipmentError, setEquipmentError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [completedFilter, setCompletedFilter] = useState("");

  const [editing, setEditing] = useState<ScheduledMaintenance | null>(null);
  const [viewing, setViewing] = useState<ScheduledMaintenance | null>(null);
  const [woDetail, setWoDetail] = useState<WorkOrderDetail | null>(null);
  const [woLoading, setWoLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<ScheduledMaintenance | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [technicians, setTechnicians] = useState<Usuario[]>([]);
  const [technicianListAvailable, setTechnicianListAvailable] = useState(false);

  const canCreate = can(role, "scheduling", "create");
  const canEdit = can(role, "scheduling", "edit");
  const canDelete = can(role, "scheduling", "delete");
  const showRequestingArea = role === "superadmin" || role === "ingeniero";
  const tableColSpan = showRequestingArea ? 7 : 6;
  const isCoordinatorOrSuperadmin =
    role === "coordinador" || role === "superadmin";
  const canRegisterMaintenance = can(role, "maintenance", "create");
  // Solo el ingeniero/técnico ejecuta la orden de trabajo; la gestión hace
  // seguimiento por el estado de la solicitud.
  const canOpenWorkOrder = role === "ingeniero";

  const workOrderId = viewing?.work_order?.id;
  useEffect(() => {
    if (!canOpenWorkOrder || !workOrderId) {
      setWoDetail(null);
      return;
    }
    let cancelled = false;
    setWoLoading(true);
    workOrdersService
      .details(workOrderId)
      .then((d) => {
        if (!cancelled) setWoDetail(d);
      })
      .catch(() => {
        if (!cancelled) setWoDetail(null);
      })
      .finally(() => {
        if (!cancelled) setWoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canOpenWorkOrder, workOrderId]);

  const equipmentOptions = useMemo(
    () =>
      equipment.map((e) => ({
        value: String(e.id),
        label: `${e.name} (${e.asset_tag})`,
      })),
    [equipment],
  );

  const equipmentLabel = (id: number) => {
    const e = equipment.find((x) => x.id === id);
    return e ? `${e.name} (${e.asset_tag})` : `Equipo #${id}`;
  };

  const load = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const data = await schedulingService.listPaginated({
        ordering: "-requested_date",
        search: search || undefined,
        is_completed:
          completedFilter === "true"
            ? true
            : completedFilter === "false"
              ? false
              : undefined,
        page: targetPage,
        page_size: PAGE_SIZE,
      });
      setItems(data.results);
      setCount(data.count);
      setPage(targetPage);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron cargar las solicitudes"));
    } finally {
      setLoading(false);
    }
  };

  // Cada aplicación de filtros (Enter o botón) vuelve a la página 1.
  const applyFilters = () => void load(1);

  useEffect(() => {
    void Promise.all([
      load(1),
      equipmentService
        .list({ ordering: "name" })
        .then((data) => {
          setEquipment(data);
          setEquipmentError(false);
        })
        .catch(() => setEquipmentError(true)),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Coordinador e ingeniero pueden listar ingenieros/operativos activos
  // (selector de responsable). Admin ve el catálogo completo.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lists = await Promise.all(
          TECHNICIAN_ROLES.map((r) =>
            usersService.list({ role: r, is_active: true, ordering: "first_name" }),
          ),
        );
        if (cancelled) return;
        const flat = lists.flat();
        const map = new Map<number, Usuario>();
        flat.forEach((u) => map.set(u.id, u));
        setTechnicians(Array.from(map.values()));
        setTechnicianListAvailable(true);
      } catch {
        if (!cancelled) {
          setTechnicians([]);
          setTechnicianListAvailable(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // El backend devuelve el responsable en dos campos anidados según el rol:
  // assigned_technician_detail (técnico) o assigned_engineer_detail (ingeniero).
  const labelForScheduleTechnician = (s: ScheduledMaintenance) =>
    assignedUserName(s.assigned_technician_detail) ??
    assignedUserName(s.assigned_engineer_detail);

  const labelForRequester = (s: ScheduledMaintenance) =>
    s.requested_by_detail?.full_name || s.requested_by_detail?.username || null;

  const openCreate = () => {
    setForm({
      ...empty,
      equipment: equipment[0]?.id ?? 0,
      requested_date: today(),
    });
    setCreating(true);
  };

  const openEdit = (s: ScheduledMaintenance) => {
    setForm({
      equipment: s.equipment,
      kind: s.kind,
      requested_date: s.requested_date,
      scheduled_date: s.scheduled_date ?? "",
      notes: s.notes ?? "",
      assigned_technician: s.assigned_technician ?? null,
      assigned_engineer: s.assigned_engineer ?? null,
    });
    setEditing(s);
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
    setForm(empty);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const assignedUser = technicians.find(
          (u) =>
            u.id === form.assigned_technician ||
            u.id === form.assigned_engineer,
        );
        await schedulingService.update(editing.id, {
          scheduled_date: form.scheduled_date || null,
          notes: form.notes,
          ...(technicianListAvailable
            ? assignmentPayload(assignedUser ?? null)
            : {
                assigned_technician: form.assigned_technician,
                assigned_engineer: form.assigned_engineer,
              }),
        });
      } else {
        await schedulingService.create({
          equipment: form.equipment,
          kind: form.kind,
          requested_date: form.requested_date || today(),
          notes: form.notes,
        });
      }
      closeModal();
      await load();
    } catch (err) {
      alert(getApiErrorMessage(err, "Error al guardar"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await schedulingService.remove(toDelete.id);
      setToDelete(null);
      await load();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo eliminar"));
    } finally {
      setDeleting(false);
    }
  };

  const completeOne = async (s: ScheduledMaintenance) => {
    try {
      await schedulingService.complete(s.id);
      await load();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo marcar como cumplida"));
    }
  };

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const start = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, count);

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-app">
            Solicitudes
          </h1>
          <p className="text-sm text-app-muted">
            Solicitudes de mantenimiento. La programación y la asignación de
            responsable se hacen después, al editar cada solicitud.
          </p>
        </div>
        {canCreate && (
          <Button leftIcon={<Plus size={16} />} onClick={openCreate}>
            Nueva solicitud
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <Input
            placeholder="Buscar por nota o tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
          />
          <Select
            placeholder="Todas"
            value={completedFilter}
            onChange={(e) => setCompletedFilter(e.target.value)}
            options={[
              { value: "false", label: "Pendientes" },
              { value: "true", label: "Cumplidas" },
            ]}
          />
          <Button variant="secondary" onClick={applyFilters}>
            Aplicar filtros
          </Button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted [&>th]:pb-2 [&>th]:pr-6 [&>th]:font-medium [&>th]:whitespace-nowrap">
                <th>Equipo</th>
                {showRequestingArea && <th>Área solicitante</th>}
                <th>Tipo</th>
                <th>Fecha de Solicitud</th>
                <th>Asignado a</th>
                <th>Estado</th>
                <th className="pr-0 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] [&>tr>td]:pr-6 [&>tr>td]:align-top">
              {loading ? (
                <tr>
                  <td
                    colSpan={tableColSpan}
                    className="py-8 text-center text-app-muted"
                  >
                    Cargando...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableColSpan}
                    className="py-8 text-center text-app-muted"
                  >
                    Sin solicitudes.
                  </td>
                </tr>
              ) : (
                items.map((s) => (
                  <tr key={s.id} className="text-app">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                          <CalendarClock size={14} />
                        </span>
                        <div>
                          <p className="font-medium">
                            {s.equipment_name ?? equipmentLabel(s.equipment)}
                          </p>
                          {labelForRequester(s) && (
                            <p className="text-xs text-app-muted">
                              {labelForRequester(s)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {showRequestingArea && (
                      <td className="py-3 text-app-muted">
                        {s.requesting_area || (
                          <span className="text-xs italic">Sin área</span>
                        )}
                      </td>
                    )}
                    <td className="py-3">
                      <Badge tone={s.kind === "PREVENTIVE" ? "info" : "danger"}>
                        {KIND_LABEL[s.kind]}
                      </Badge>
                    </td>
                    <td className="py-3 text-app-muted whitespace-nowrap">
                      <div>
                        {s.requested_date}
                      </div>
                      {s.work_order?.status === "FINISHED" && (
                        <div className="text-xs">
                          <span className="text-xs uppercase tracking-wide">
                            Fin
                          </span>{" "}
                          {formatDateTime(s.work_order.end_date)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-app-muted">
                      {labelForScheduleTechnician(s) ? (
                        <span className="inline-flex items-center gap-1.5">
                          <User size={12} className="text-app-muted" />
                          <span className="text-app">
                            {labelForScheduleTechnician(s)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="py-3">
                      <Badge tone={scheduleEstado(s).tone}>
                        {scheduleEstado(s).label}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Eye size={14} />}
                          onClick={() => setViewing(s)}
                        >
                          Detalle
                        </Button>
                        {s.work_order ? (
                          canOpenWorkOrder ? (
                            <Button
                              size="sm"
                              leftIcon={<Wrench size={14} />}
                              onClick={() => navigate("/admin/ordenes-trabajo")}
                            >
                              Ver orden de trabajo
                            </Button>
                          ) : (
                            <span className="text-xs text-app-muted">
                              Orden {s.work_order.number}
                            </span>
                          )
                        ) : (
                          canRegisterMaintenance &&
                          !canOpenWorkOrder &&
                          !s.is_completed && (
                            <Button
                              size="sm"
                              leftIcon={<Wrench size={14} />}
                              onClick={() =>
                                navigate(
                                  `/admin/mantenimientos?scheduling=${s.id}`,
                                )
                              }
                            >
                              Realizar mantenimiento
                            </Button>
                          )
                        )}
                        {canEdit && !s.is_completed && (
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<Check size={14} />}
                            onClick={() => void completeOne(s)}
                          >
                            Cumplir
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<Pencil size={14} />}
                            onClick={() => openEdit(s)}
                          >
                            {s.scheduled_date ? "Editar" : "Programar"}
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="danger"
                            leftIcon={<Trash2 size={14} />}
                            onClick={() => setToDelete(s)}
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-app pt-3 text-xs text-app-muted">
          <p>
            {count === 0
              ? "Sin resultados"
              : `Mostrando ${start}–${end} de ${count}`}
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<ChevronLeft size={14} />}
              disabled={page <= 1 || loading}
              onClick={() => void load(Math.max(1, page - 1))}
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
              onClick={() => void load(Math.min(totalPages, page + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Detalle de la solicitud"
        size={canOpenWorkOrder && workOrderId ? "xl" : "lg"}
      >
        {viewing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
                Equipo
              </p>
              <p className="mt-0.5 text-sm font-medium text-app">
                {viewing.equipment_name ?? equipmentLabel(viewing.equipment)}
                {viewing.equipment_asset_tag
                  ? ` (${viewing.equipment_asset_tag})`
                  : ""}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
                Solicitante
              </p>
              <p className="mt-0.5 text-sm text-app">
                {labelForRequester(viewing) ?? "—"}
              </p>
            </div>
            {showRequestingArea && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
                  Área solicitante
                </p>
                <p className="mt-0.5 text-sm text-app">
                  {viewing.requesting_area ?? "—"}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
                Tipo
              </p>
              <p className="mt-0.5 text-sm text-app">
                {KIND_LABEL[viewing.kind]}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
                Estado
              </p>
              <p className="mt-0.5 text-sm text-app">
                {scheduleEstado(viewing).label}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
                Fecha de solicitud
              </p>
              <p className="mt-0.5 text-sm text-app">{viewing.requested_date}</p>
            </div>
            {viewing.scheduled_date && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
                Fecha programada
              </p>
              <p className="mt-0.5 text-sm text-app">
                {viewing.scheduled_date}
              </p>
            </div>
            )}
            {viewing.work_order?.status === "FINISHED" && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
                  Fecha fin
                </p>
                <p className="mt-0.5 text-sm text-app">
                  {formatDateTime(viewing.work_order.end_date)}
                </p>
              </div>
            )}
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
                Asignado a
              </p>
              <p className="mt-0.5 text-sm text-app">
                {labelForScheduleTechnician(viewing) ?? "Sin asignar"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
                Descripción
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-app">
                {viewing.notes?.trim() ? viewing.notes : "Sin descripción"}
              </p>
            </div>
            {viewing.maintenance_record_detail && (
              <p className="inline-flex items-center gap-1 text-xs text-app-muted sm:col-span-2">
                <Wrench size={11} />
                Cumplida por mantenimiento #{viewing.maintenance_record_detail.id}{" "}
                · {viewing.maintenance_record_detail.date}
              </p>
            )}
            {canOpenWorkOrder && workOrderId && (
              <div className="sm:col-span-2 border-t border-app pt-4">
                {woLoading && !woDetail ? (
                  <p className="text-sm text-app-muted">Cargando intervención...</p>
                ) : woDetail ? (
                  <div className="grid gap-3 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
                      Intervención · Orden {woDetail.number}
                    </p>
                    <div>
                      <p className="font-semibold text-app">Repuestos</p>
                      {(woDetail.spare_parts ?? []).length === 0 ? (
                        <p className="text-xs text-app-muted">Sin registros.</p>
                      ) : (
                        (woDetail.spare_parts ?? []).map((r) => (
                          <p key={r.id} className="text-app">
                            {r.name} · {r.reference} · x{r.quantity} · $
                            {r.total_cost}
                          </p>
                        ))
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-app">Mediciones</p>
                      {(woDetail.measurements ?? []).length === 0 ? (
                        <p className="text-xs text-app-muted">Sin registros.</p>
                      ) : (
                        (woDetail.measurements ?? []).map((r) => (
                          <p key={r.id} className="text-app">
                            {r.parameter}: {r.measured_value} {r.unit} (esp.{" "}
                            {r.expected_value}) {r.passed ? "OK" : "No"}
                          </p>
                        ))
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-app">Evidencias</p>
                      {(woDetail.evidences ?? []).length === 0 ? (
                        <p className="text-xs text-app-muted">Sin registros.</p>
                      ) : (
                        (woDetail.evidences ?? []).map((r) => (
                          <p key={r.id} className="text-app">
                            {r.evidence_type}: {r.description}
                          </p>
                        ))
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-app">Firmas</p>
                      {(woDetail.signatures ?? []).length === 0 ? (
                        <p className="text-xs text-app-muted">Sin registros.</p>
                      ) : (
                        (woDetail.signatures ?? []).map((r) => (
                          <p key={r.id} className="text-app">
                            {r.signed_by}
                            {r.signed_at
                              ? ` · ${new Date(r.signed_at).toLocaleString()}`
                              : ""}
                          </p>
                        ))
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-app">Costos</p>
                      {woDetail.cost ? (
                        <p className="text-app">
                          Mano de obra ${woDetail.cost.labor_cost} · Repuestos $
                          {woDetail.cost.spare_parts_cost} · Transporte $
                          {woDetail.cost.transport_cost} · Otros $
                          {woDetail.cost.other_cost} · Total $
                          {woDetail.cost.total ?? "—"}
                        </p>
                      ) : (
                        <p className="text-xs text-app-muted">
                          Sin costos registrados.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
            <div className="flex justify-end sm:col-span-2">
              <Button variant="secondary" onClick={() => setViewing(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={creating || !!editing}
        onClose={closeModal}
        title={editing ? "Programar solicitud" : "Nueva solicitud"}
        size="lg"
      >
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {editing || (creating && isCoordinatorOrSuperadmin) ? (
            <div className="sm:col-span-2">
              <Input
                label="Equipo"
                value={
                  editing
                    ? editing.equipment_name
                      ? `${editing.equipment_name}${
                          editing.equipment_asset_tag
                            ? ` (${editing.equipment_asset_tag})`
                            : ""
                        }`
                      : equipmentLabel(editing.equipment)
                    : equipmentLabel(form.equipment)
                }
                readOnly
                disabled
              />
            </div>
          ) : (
            <div className="sm:col-span-2">
              <Select
                label="Equipo"
                value={String(form.equipment)}
                onChange={(e) =>
                  setForm({ ...form, equipment: Number(e.target.value) })
                }
                options={equipmentOptions}
                placeholder="Selecciona un equipo"
                required
                error={
                  equipmentOptions.length === 0 && equipmentError
                    ? "No se pudieron cargar los equipos. Recarga la página e inténtalo de nuevo."
                    : undefined
                }
                hint={
                  equipmentOptions.length === 0 && !equipmentError
                    ? "Aún no hay equipos registrados en el sistema."
                    : undefined
                }
              />
            </div>
          )}
          {editing || (creating && isCoordinatorOrSuperadmin) ? (
            <Input
              label="Tipo"
              value={KIND_LABEL[editing ? editing.kind : form.kind]}
              readOnly
              disabled
            />
          ) : (
            <Select
              label="Tipo"
              value={form.kind}
              onChange={(e) =>
                setForm({ ...form, kind: e.target.value as ScheduleKind })
              }
              options={Object.entries(KIND_LABEL).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          )}
          {editing ? (
            <Input
              label="Fecha programada"
              type="date"
              value={form.scheduled_date}
              onChange={(e) =>
                setForm({ ...form, scheduled_date: e.target.value })
              }
            />
          ) : (
            <Input
              label="Fecha de solicitud"
              type="date"
              value={form.requested_date}
              onChange={(e) =>
                setForm({ ...form, requested_date: e.target.value })
              }
              required
            />
          )}
          {editing && (
            <div className="sm:col-span-2">
              {technicianListAvailable ? (
                <TechnicianSelect
                  label="Asignado a"
                  value={
                    form.assigned_technician ?? form.assigned_engineer ?? null
                  }
                  onChange={(_id, user) =>
                    setForm({ ...form, ...assignmentPayload(user ?? null) })
                  }
                  technicians={technicians}
                  hint="Ingeniero o usuario operativo. Opcional — puedes asignarlo más tarde."
                />
              ) : (
                <Input
                  label="ID del asignado (opcional)"
                  type="number"
                  value={form.assigned_technician ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      assigned_technician: e.target.value
                        ? Number(e.target.value)
                        : null,
                      assigned_engineer: null,
                    })
                  }
                  hint="Tu rol no lista usuarios; deja vacío o escribe el ID del responsable."
                />
              )}
            </div>
          )}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-app">Notas</label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-app bg-surface px-3 py-2.5 text-sm text-app outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="secondary" onClick={closeModal} type="button">
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Cancelar solicitud"
        description="¿Eliminar esta solicitud? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
