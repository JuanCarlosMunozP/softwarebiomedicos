import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABEL, can } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
import { fullNameOf } from "@/lib/users";
import { dashboardService } from "@/services/dashboard.service";
import type {
  DashboardSummary,
  EquipmentStatusBucket,
  FailureSeverity,
  FailureSeverityBucket,
  MaintenanceKind,
  MaintenanceMonthBucket,
} from "@/types/dashboard";
import type { EquipmentStatus } from "@/types/equipment";

const STATUS_LABEL: Record<EquipmentStatus, string> = {
  ACTIVE: "Operativo",
  IN_MAINTENANCE: "En mantenimiento",
  IN_REPAIR: "En reparación",
  INACTIVE: "Fuera de servicio",
};

const STATUS_COLOR: Record<EquipmentStatus, string> = {
  ACTIVE: "#10b981",
  IN_MAINTENANCE: "#f59e0b",
  IN_REPAIR: "#ef4444",
  INACTIVE: "#94a3b8",
};

const SEVERITY_LABEL: Record<FailureSeverity, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

const SEVERITY_COLOR: Record<FailureSeverity, string> = {
  LOW: "#0ea5e9",
  MEDIUM: "#eab308",
  HIGH: "#f97316",
  CRITICAL: "#dc2626",
};

const KIND_COLOR: Record<MaintenanceKind, string> = {
  PREVENTIVE: "#3b82f6",
  CORRECTIVE: "#f59e0b",
  REPAIR: "#ef4444",
  CALIBRATION: "#8b5cf6",
  INSPECTION: "#64748b",
};

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function formatCost(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return COP.format(n);
}

function formatHours(value: string | number | null | undefined): string {
  if (value == null || value === "") return "Sin datos";
  const hours = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(hours) || hours < 0) return "Sin datos";
  if (hours < 24) return `${hours.toFixed(1)} h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours - days * 24);
  return rem > 0 ? `${days} d ${rem} h` : `${days} d`;
}

function formatWeekday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
  });
}

type DateGrain = "day" | "month" | "year";

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function inDateRange(iso: string, from: string, to: string): boolean {
  const d = dateKey(iso);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function grainKey(iso: string, grain: DateGrain): string {
  const d = dateKey(iso);
  if (grain === "year") return d.slice(0, 4);
  if (grain === "month") return d.slice(0, 7);
  return d;
}

function grainLabel(key: string, grain: DateGrain): string {
  if (grain === "year") return key;
  if (grain === "month") {
    const [y, m] = key.split("-").map(Number);
    if (!y || !m) return key;
    return new Date(y, m - 1, 1)
      .toLocaleString("es-CO", { month: "short", year: "2-digit" })
      .replace(/\./g, "");
  }
  const [y, mo, d] = key.split("-").map(Number);
  if (!y || !mo || !d) return key;
  return new Date(y, mo - 1, d).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}

function MonthLabel({ month }: { month: string }): string {
  // "2026-05" → "May 26"
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  const d = new Date(y, m - 1, 1);
  return d
    .toLocaleString("es-CO", { month: "short", year: "2-digit" })
    .replace(/\./g, "");
}

export function DashboardPage() {
  const { usuario } = useAuth();
  const role = usuario?.role;

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    dashboardService
      .summary()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled)
          setError(getApiErrorMessage(err, "No se pudo cargar el dashboard"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fullName = usuario ? fullNameOf(usuario) : "";

  const canViewEquipment = can(role, "equipment", "view");
  const canViewFailures = can(role, "failures", "view");
  const canViewScheduling = can(role, "scheduling", "view");
  const canViewMaintenance = can(role, "maintenance", "view");
  const isOperativo = role === "tecnico";

  const greeting = isOperativo
    ? `Tus reportes de falla${usuario?.area ? ` · ${usuario.area}` : ""}.`
    : role === "usuario"
      ? "Monitorea las solicitudes que has creado: pendientes y cumplidas."
      : role === "ingeniero"
        ? "Tus tareas asignadas: pendientes por resolver y ya resueltas."
        : "Resumen general del estado de los equipos biomédicos.";

  const myTasksCount =
    (data?.my_tasks?.schedules?.length ?? 0) +
    (data?.my_tasks?.failures?.length ?? 0);

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-app sm:text-3xl">
          Hola, {fullName} 👋
        </h1>
        <p className="text-sm text-app-muted">
          {usuario && (
            <>
              Tu perfil:{" "}
              <span className="font-medium text-app">
                {ROLE_LABEL[usuario.role]}
              </span>
              . {greeting}
            </>
          )}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {loading && !data ? (
        <p className="py-12 text-center text-app-muted">Cargando dashboard…</p>
      ) : data ? (
        <>
          {role === "usuario" ? (
            data.area_ops ? (
              <AreaOpsDashboard ops={data.area_ops} />
            ) : (
              <p className="py-12 text-center text-app-muted">
                Aún no hay solicitudes para monitorear.
              </p>
            )
          ) : role === "ingeniero" ? (
            <EngineerTasksDashboard
              tasks={
                data.engineer_tasks ?? {
                  kpis: { assigned: 0, pending: 0, in_progress: 0, resolved: 0 },
                  recent: [],
                }
              }
            />
          ) : isOperativo && data.area_ops ? (
            <AreaOpsDashboard ops={data.area_ops} />
          ) : (
            <>
          {role === "tecnico" && data.my_week && (
            <OperativoWeekSection week={data.my_week} />
          )}

          {myTasksCount > 0 && canViewScheduling && (
            <MyTasksSection schedules={data.my_tasks?.schedules ?? []} />
          )}

          {canViewScheduling && data.kpis.scheduling.overdue > 0 && (
            <div
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              Hay {data.kpis.scheduling.overdue} solicitud
              {data.kpis.scheduling.overdue === 1 ? "" : "es"} vencida
              {data.kpis.scheduling.overdue === 1 ? "" : "s"}: pendientes cuya
              fecha de fin ya llegó o ya pasó.
            </div>
          )}

          <AdminOverview
            data={data}
            role={role}
            canViewEquipment={canViewEquipment}
            canViewFailures={canViewFailures}
            canViewScheduling={canViewScheduling}
            canViewMaintenance={canViewMaintenance}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            {canViewScheduling && (
              <OverdueSchedulesList items={data.lists.overdue_schedules} />
            )}
            {canViewEquipment && (
              <WorstMtbfList items={data.lists.worst_mtbf} />
            )}
          </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

function EngineerTasksDashboard({
  tasks,
}: {
  tasks: NonNullable<DashboardSummary["engineer_tasks"]>;
}) {
  const typeLabel: Record<string, string> = {
    PREVENTIVE: "Preventivo",
    CORRECTIVE: "Correctivo",
    CALIBRATION: "Calibración",
    INSTALLATION: "Instalación",
    INSPECTION: "Inspección",
  };
  const statusLabel: Record<string, string> = {
    PENDING: "Pendiente",
    IN_PROGRESS: "En proceso",
    FINISHED: "Terminada",
    CANCELLED: "Cancelada",
  };
  const [fromDraft, setFromDraft] = useState("");
  const [toDraft, setToDraft] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const applyFilters = () => {
    let from = fromDraft;
    let to = toDraft;
    if (from && to && from > to) {
      const swap = from;
      from = to;
      to = swap;
      setFromDraft(from);
      setToDraft(to);
    }
    setFromDate(from);
    setToDate(to);
  };

  const filteredSeries = useMemo(() => {
    const series = tasks.series ?? [];
    if (!fromDate && !toDate) return series;
    return series.filter((row) => {
      const d =
        row.status === "FINISHED" && row.end_date
          ? row.end_date
          : row.start_date;
      return inDateRange(d, fromDate, toDate);
    });
  }, [tasks.series, fromDate, toDate]);

  const kpis = useMemo(() => {
    if (!tasks.series || (!fromDate && !toDate)) return tasks.kpis;
    return {
      assigned: filteredSeries.length,
      pending: filteredSeries.filter((row) => row.status === "PENDING").length,
      in_progress: filteredSeries.filter((row) => row.status === "IN_PROGRESS")
        .length,
      resolved: filteredSeries.filter((row) => row.status === "FINISHED")
        .length,
    };
  }, [tasks.kpis, tasks.series, filteredSeries, fromDate, toDate]);

  const scatterGroups = useMemo(() => {
    const yOf: Record<string, number> = {
      PENDING: 1,
      IN_PROGRESS: 2,
      FINISHED: 3,
    };
    const toPoint = (row: { status: string; start_date: string; end_date: string | null }) => {
      const d =
        row.status === "FINISHED" && row.end_date
          ? row.end_date
          : row.start_date;
      const key = dateKey(d);
      return {
        x: Date.parse(`${key}T12:00:00`),
        y: yOf[row.status] ?? 0,
        date: key,
        status:
          row.status === "PENDING"
            ? "Pendiente"
            : row.status === "IN_PROGRESS"
              ? "En proceso"
              : row.status === "FINISHED"
                ? "Resuelta"
                : row.status,
      };
    };
    return {
      pending: filteredSeries.filter((row) => row.status === "PENDING").map(toPoint),
      inProgress: filteredSeries
        .filter((row) => row.status === "IN_PROGRESS")
        .map(toPoint),
      resolved: filteredSeries
        .filter((row) => row.status === "FINISHED")
        .map(toPoint),
    };
  }, [filteredSeries]);

  const xDomain = useMemo((): [number, number] => {
    const fromTs = fromDate ? Date.parse(`${fromDate}T00:00:00`) : Number.NaN;
    const toTs = toDate ? Date.parse(`${toDate}T23:59:59`) : Number.NaN;
    if (Number.isFinite(fromTs) && Number.isFinite(toTs)) {
      return fromTs === toTs
        ? [fromTs - 12 * 3600000, toTs + 12 * 3600000]
        : [fromTs, toTs];
    }
    const xs = filteredSeries.map((row) => {
      const d =
        row.status === "FINISHED" && row.end_date
          ? row.end_date
          : row.start_date;
      return Date.parse(`${dateKey(d)}T12:00:00`);
    }).filter((n) => Number.isFinite(n));
    let min = Number.isFinite(fromTs) ? fromTs : (xs.length ? Math.min(...xs) : Date.now());
    let max = Number.isFinite(toTs) ? toTs : (xs.length ? Math.max(...xs) : Date.now());
    if (min === max) {
      min -= 12 * 3600000;
      max += 12 * 3600000;
    }
    return [min, max];
  }, [filteredSeries, fromDate, toDate]);

  const pie = [
    { name: "Pendientes", count: kpis.pending, fill: "#f59e0b" },
    { name: "En proceso", count: kpis.in_progress, fill: "#3b82f6" },
    { name: "Resueltas", count: kpis.resolved, fill: "#10b981" },
  ];
  const pieTotal = kpis.pending + kpis.in_progress + kpis.resolved;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-app-muted">Tareas asignadas</p>
              <p className="mt-1 text-2xl font-bold text-app">
                {kpis.assigned}
              </p>
              <p className="mt-1 text-xs text-app-muted">
                Órdenes de trabajo a tu cargo
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/40">
              <ClipboardList size={20} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-app-muted">Tareas pendientes</p>
              <p className="mt-1 text-2xl font-bold text-app">
                {kpis.pending}
              </p>
              <p className="mt-1 text-xs text-app-muted">
                Estado pendiente
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/40">
              <Wrench size={20} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-app-muted">En proceso</p>
              <p className="mt-1 text-2xl font-bold text-app">
                {kpis.in_progress}
              </p>
              <p className="mt-1 text-xs text-app-muted">
                Mantenimiento en curso
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/40">
              <Wrench size={20} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-app-muted">Tareas resueltas</p>
              <p className="mt-1 text-2xl font-bold text-app">
                {kpis.resolved}
              </p>
              <p className="mt-1 text-xs text-app-muted">
                Mantenimientos ya realizados
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/40">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          type="date"
          label="Desde"
          value={fromDraft}
          max={toDraft || undefined}
          onChange={(e) => {
            const value = e.target.value;
            setFromDraft(value);
            setFromDate(value);
          }}
        />
        <Input
          type="date"
          label="Hasta"
          value={toDraft}
          min={fromDraft || undefined}
          onChange={(e) => {
            const value = e.target.value;
            setToDraft(value);
            setToDate(value);
          }}
        />
        <div className="flex items-end">
          <Button
            type="button"
            variant="secondary"
            onClick={applyFilters}
            className="w-full"
          >
            Aplicar filtros
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Tareas por fecha"
          subtitle={
            fromDate || toDate
              ? `Dispersión de tareas${fromDate ? ` desde ${fromDate}` : ""}${
                  toDate ? ` hasta ${toDate}` : ""
                }`
              : "Dispersión de tareas asignadas, pendientes, en proceso y resueltas"
          }
        />
        <div className="h-72">
          {filteredSeries.length === 0 && !fromDate && !toDate ? (
            <p className="py-8 text-center text-sm text-app-muted">
              No hay tareas para graficar.
            </p>
          ) : (
            <ResponsiveContainer
              key={`${fromDate}|${toDate}`}
              width="100%"
              height={256}
              minWidth={0}
            >
              <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={xDomain}
                  allowDataOverflow
                  tickCount={6}
                  tickFormatter={(value: number) =>
                    new Date(value).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                    })
                  }
                  allowDecimals={false}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[0.5, 3.5]}
                  ticks={[1, 2, 3]}
                  tickFormatter={(value: number) =>
                    value === 1
                      ? "Pendiente"
                      : value === 2
                        ? "En proceso"
                        : value === 3
                          ? "Resuelta"
                          : ""
                  }
                  width={90}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(_value, _name, item) => {
                    const payload = item?.payload as
                      | { date?: string; status?: string }
                      | undefined;
                    return [payload?.status ?? "", payload?.date ?? ""];
                  }}
                  labelFormatter={() => ""}
                />
                <Legend />
                <Scatter
                  name="Pendientes"
                  data={scatterGroups.pending}
                  fill="#f59e0b"
                />
                <Scatter
                  name="En proceso"
                  data={scatterGroups.inProgress}
                  fill="#3b82f6"
                />
                <Scatter
                  name="Resueltas"
                  data={scatterGroups.resolved}
                  fill="#10b981"
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card padding="sm">
          <CardHeader
            compact
            title="Pendientes / en proceso / resueltas"
            subtitle="Estado de las tareas que tienes asignadas"
          />
          <div className="h-40">
            {pieTotal === 0 ? (
              <p className="py-6 text-center text-sm text-app-muted">
                Aún no tienes tareas asignadas.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={160} minWidth={0}>
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={62}
                    paddingAngle={2}
                    label
                  >
                    {pie.map((row) => (
                      <Cell key={row.name} fill={row.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Cola de trabajo"
            subtitle="Tareas pendientes por resolver"
            action={
              <Link
                to="/admin/ordenes-trabajo"
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                Ver todas →
              </Link>
            }
          />
          {tasks.recent.length === 0 ? (
            <div className="py-8 text-center text-sm text-app-muted">
              <CheckCircle2
                size={24}
                className="mx-auto mb-2 text-emerald-500"
              />
              No hay tareas pendientes.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {tasks.recent.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-app">{t.equipment_name}</p>
                    <p className="text-xs text-app-muted">
                      <span className="font-mono">{t.number}</span>
                      {" · "}
                      <span className="font-mono">{t.equipment_asset_tag}</span>
                      {" · "}
                      {typeLabel[t.service_type] ?? t.service_type}
                    </p>
                  </div>
                  <Badge tone={t.status === "IN_PROGRESS" ? "info" : "warning"}>
                    {statusLabel[t.status] ?? t.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayIso(): string {
  return toIsoDate(new Date());
}

function periodKeys(from: string, to: string, grain: DateGrain): string[] {
  const start = from || "1970-01-01";
  const end = to || todayIso();
  if (start > end) return [];
  const keys: string[] = [];
  if (grain === "year") {
    let y = Number(start.slice(0, 4));
    const yEnd = Number(end.slice(0, 4));
    while (y <= yEnd) {
      keys.push(String(y));
      y += 1;
    }
    return keys;
  }
  if (grain === "month") {
    let y = Number(start.slice(0, 4));
    let m = Number(start.slice(5, 7));
    const yEnd = Number(end.slice(0, 4));
    const mEnd = Number(end.slice(5, 7));
    while (y < yEnd || (y === yEnd && m <= mEnd)) {
      keys.push(`${y}-${String(m).padStart(2, "0")}`);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return keys;
  }
  const cursor = new Date(
    Number(start.slice(0, 4)),
    Number(start.slice(5, 7)) - 1,
    Number(start.slice(8, 10)),
  );
  const last = new Date(
    Number(end.slice(0, 4)),
    Number(end.slice(5, 7)) - 1,
    Number(end.slice(8, 10)),
  );
  while (cursor <= last) {
    keys.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

function orderedDateRange(from: string, to: string): { from: string; to: string } {
  const start = from || "1970-01-01";
  const end = to || todayIso();
  return start <= end ? { from: start, to: end } : { from: end, to: start };
}

type SolicitudesChartRow = {
  key: string;
  label: string;
  Preventivo: number;
  Reparación: number;
  costo: number;
};

function buildCoordinatorChartData(
  series: { date: string; kind?: string }[],
  costs: { date: string; cost: string }[],
  from: string,
  to: string,
  grain: DateGrain,
): SolicitudesChartRow[] {
  const range =
    from && to ? orderedDateRange(from, to) : { from, to };
  const buckets = new Map<
    string,
    { Preventivo: number; Reparación: number; costo: number }
  >();
  if (range.from && range.to) {
    for (const key of periodKeys(range.from, range.to, grain)) {
      buckets.set(key, { Preventivo: 0, Reparación: 0, costo: 0 });
    }
  }
  const ensure = (key: string) => {
    let row = buckets.get(key);
    if (!row) {
      row = { Preventivo: 0, Reparación: 0, costo: 0 };
      buckets.set(key, row);
    }
    return row;
  };
  for (const p of series) {
    if (!inDateRange(p.date, range.from, range.to)) continue;
    const row = ensure(grainKey(p.date, grain));
    if (String(p.kind).toUpperCase() === "REPAIR") row.Reparación += 1;
    else row.Preventivo += 1;
  }
  for (const c of costs) {
    if (!inDateRange(c.date, range.from, range.to)) continue;
    const row = ensure(grainKey(c.date, grain));
    const n = Number(c.cost);
    if (Number.isFinite(n)) row.costo += n;
  }
  let rows = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, row]) => ({
      key,
      label: grainLabel(key, grain),
      ...row,
    }));
  if (grain === "day" && rows.length > 45) {
    rows = rows.filter(
      (row) => row.Preventivo > 0 || row.Reparación > 0 || row.costo > 0,
    );
  }
  return rows;
}

function buildAdministratorChartData(
  series: {date:string;kind?:string}[],
  costs: {date:string,cost?:string}[],
  from:string,
  to:string,
  grain:DateGrain
): SolicitudesChartRow[] {
  const range =
    from && to ? orderedDateRange(from,to) : {from,to};
  const buckets = new Map<
    string,
    {Preventivo: number; Reparación:number;costo:number}
    >();
    if (range.from && range.to) {
      for (const key of periodKeys(range.from,range.to,grain)) {
        buckets.set(key,{Preventivo:0,Reparación:0,costo:0});
      }
    }

    const ensure = (key:string) => {
      let row = buckets.get(key);
      if (!row) {
        row = {Preventivo:0,Reparación:0,costo:0};
        buckets.set(key,row);
      }
      return row;
    }
    for (const p of series) {
      if (!inDateRange(p.date, range.from,range.to)) continue;
      const row = ensure(grainKey(p.date,grain));
      if (String(p.kind).toUpperCase() === "REPAIR") row.Reparación +=1 
      else row.Preventivo += 1;
    }
    for (const c of costs) {
      if (!inDateRange(c.date,range.from,range.to)) continue;
      const row = ensure(grainKey(c.date,grain));
      const n = Number(c.cost);
      if (Number.isFinite(n)) row.costo += n;
    }
    let rows = Array.from(buckets.entries())
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([key,row]) => ({
        key,
        label:grainLabel(key,grain),
        ...row,
      }));

    if (grain === "day" && rows.length > 45) {
      rows = rows.filter(
        (row) => row.Preventivo > 0 || row.Reparación > 0 || row.costo > 0,
      )
    }
    return rows;
}

function AreaOpsDashboard({
  ops,
}: {
  ops: NonNullable<DashboardSummary["area_ops"]>;
}) {
  const isRequests = ops.source === "schedules";
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [grain, setGrain] = useState<DateGrain>("month");

  const series = useMemo(() => {
    if (ops.series && ops.series.length > 0) return ops.series;
    return ops.recent.map((r) => ({
      date: r.reported_at,
      resolved: r.resolved,
    }));
  }, [ops.series, ops.recent]);

  const filtered = useMemo(
    () =>
      isRequests
        ? series.filter((p) => inDateRange(p.date, fromDate, toDate))
        : series,
    [series, isRequests, fromDate, toDate],
  );

  const recentFiltered = useMemo(
    () =>
      isRequests
        ? ops.recent.filter((r) => inDateRange(r.reported_at, fromDate, toDate))
        : ops.recent,
    [ops.recent, isRequests, fromDate, toDate],
  );

  const statusChart = isRequests
    ? [
        {
          name: "Pendientes",
          count: filtered.filter((p) => !p.resolved).length,
          fill: "#f59e0b",
        },
        {
          name: "Cumplidas",
          count: filtered.filter((p) => p.resolved).length,
          fill: "#10b981",
        },
      ]
    : [
        {
          name: "Abiertas",
          count: ops.kpis.this_week_open ?? 0,
          fill: "#f59e0b",
        },
        {
          name: "Resueltas",
          count: ops.kpis.this_week_resolved ?? 0,
          fill: "#10b981",
        },
      ];
  const statusTotal = statusChart.reduce((s, r) => s + r.count, 0);

  const requestBars = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const p of filtered) {
      const key = grainKey(p.date, grain);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({
        key,
        label: grainLabel(key, grain),
        count,
      }));
  }, [filtered, grain]);

  const weekBars = ops.this_week_by_day.map((row) => ({
    key: row.date,
    label: formatWeekday(row.date),
    count: row.count,
  }));
  const barData = isRequests ? requestBars : weekBars;

  return (
    <>
      <div
        className={
          isRequests
            ? "grid gap-4 sm:grid-cols-3"
            : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        }
      >
        <Card>
          <p className="text-xs text-app-muted">
            {isRequests
              ? "Solicitudes"
              : "Cantidad de fallas reportadas"}
          </p>
          <p className="mt-1 text-2xl font-bold text-app">
            {isRequests ? filtered.length : ops.kpis.total}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-app-muted">
            {isRequests
              ? "Estado de tus solicitudes"
              : "Estado de fallas reportadas"}
          </p>
          <p className="mt-1 text-2xl font-bold text-app">
            {isRequests
              ? `${filtered.filter((p) => !p.resolved).length} pendientes`
              : `${ops.kpis.open} abiertas`}
          </p>
          <p className="text-xs text-app-muted">
            {isRequests
              ? `${filtered.filter((p) => p.resolved).length} cumplidas`
              : `${ops.kpis.resolved} resueltas`}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-app-muted">
            {isRequests ? "Monitoreo" : "Área"}
          </p>
          <p className="mt-1 text-2xl font-bold text-app">
            {isRequests
              ? "Solicitudes"
              : ops.area || "Sin área asignada"}
          </p>
        </Card>
        {!isRequests && (
          <Card>
            <p className="text-xs text-app-muted">Reportes esta semana</p>
            <p className="mt-1 text-2xl font-bold text-app">
              {ops.kpis.this_week}
            </p>
          </Card>
        )}
      </div>

      {!isRequests && !ops.area && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          Un administrador debe asignarte un área (ej. Radiología) para ver
          equipos y reportar fallas.
        </p>
      )}

      {isRequests && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            type="date"
            label="Desde"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            type="date"
            label="Hasta"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <Select
            label="Fechas"
            value={grain}
            onChange={(e) => setGrain(e.target.value as DateGrain)}
            options={[
              { value: "day", label: "Día" },
              { value: "month", label: "Mes" },
              { value: "year", label: "Año" },
            ]}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={isRequests ? "Estado de solicitudes" : "Reportes de la semana"}
            subtitle={
              isRequests
                ? "Pendientes vs cumplidas"
                : "Gráfico de pastel: abiertas vs resueltas en tus reportes"
            }
          />
          <div className="h-64">
            {statusTotal === 0 ? (
              <p className="py-8 text-center text-sm text-app-muted">
                {isRequests
                  ? fromDate || toDate
                    ? "No hay solicitudes en el rango de fechas."
                    : "No has creado solicitudes todavía."
                  : "Esta semana no has generado reportes."}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={256} minWidth={0}>
                <PieChart>
                  <Pie
                    data={statusChart}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    label
                  >
                    {statusChart.map((row) => (
                      <Cell key={row.name} fill={row.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader
            title={isRequests ? "Fecha de solicitud" : "Fecha de reporte"}
            subtitle={
              isRequests
                ? grain === "year"
                  ? "Barras por año"
                  : grain === "month"
                    ? "Barras por mes"
                    : "Barras por día"
                : "Barras: reportes que realizaste cada día de esta semana"
            }
          />
          <div className="h-64">
            {barData.length === 0 ? (
              <p className="py-8 text-center text-sm text-app-muted">
                {isRequests
                  ? "No hay solicitudes para graficar en este rango."
                  : "Esta semana no has generado reportes."}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={256} minWidth={0}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    name={isRequests ? "Solicitudes" : "Reportes"}
                    fill="#0ea5e9"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={isRequests ? "Mis solicitudes" : "Mis reportes"}
          subtitle={
            isRequests
              ? "Estado y nota de las solicitudes que tú creaste"
              : "Estado, fecha, oportunidad y solución de lo que tú reportaste"
          }
        />
        {recentFiltered.length === 0 ? (
          <p className="py-6 text-center text-sm text-app-muted">
            {isRequests
              ? fromDate || toDate
                ? "No hay solicitudes en el rango de fechas."
                : "No has creado solicitudes todavía."
              : "No has generado reportes todavía."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted">
                  <th className="pb-2 font-medium">Equipo</th>
                  <th className="pb-2 font-medium">
                    {isRequests ? "Fecha de solicitud" : "Fecha de reporte"}
                  </th>
                  <th className="pb-2 font-medium">Estado</th>
                  {!isRequests && (
                    <th className="pb-2 font-medium">Oportunidad</th>
                  )}
                  <th className="pb-2 font-medium">
                    {isRequests ? "Nota" : "Solución del reporte"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recentFiltered.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2">
                      <p className="font-medium text-app">{r.equipment_name}</p>
                      <p className="text-xs text-app-muted">
                        <span className="font-mono">{r.equipment_asset_tag}</span>
                      </p>
                    </td>
                    <td className="py-2 text-app-muted">
                      {r.reported_at.slice(0, 10)}
                    </td>
                    <td className="py-2">
                      <Badge tone={r.resolved ? "success" : "warning"}>
                        {r.resolved
                          ? isRequests
                            ? "Cumplida"
                            : "Resuelta"
                          : isRequests
                            ? "Pendiente"
                            : "Abierta"}
                      </Badge>
                    </td>
                    {!isRequests && (
                      <td className="py-2 text-app-muted">
                        {r.resolved
                          ? formatHours(r.opportunity_hours)
                          : "En espera"}
                      </td>
                    )}
                    <td className="py-2 text-app-muted">
                      {r.resolution_notes?.trim()
                        ? r.resolution_notes
                        : r.resolved
                          ? "Sin notas"
                          : "Pendiente"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-4">
          {!isRequests && (
            <Link
              to="/admin/fallas"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              Reportar o ver mis fallas →
            </Link>
          )}
          <Link
            to="/admin/agendamientos"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            Ver solicitudes →
          </Link>
        </div>
      </Card>
    </>
  );
}

function AdminOverview({
  data,
  role,
  canViewEquipment,
  canViewFailures,
  canViewScheduling,
  canViewMaintenance,
}: {
  data: DashboardSummary;
  role: string | undefined;
  canViewEquipment: boolean;
  canViewFailures: boolean;
  canViewScheduling: boolean;
  canViewMaintenance: boolean;
}) {
  const showDateFilter =
    canViewMaintenance && (role === "coordinador" || role === "superadmin");
  const [fromDraft, setFromDraft] = useState("");
  const [toDraft, setToDraft] = useState("");
  const [grainDraft, setGrainDraft] = useState<DateGrain>("month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [grain, setGrain] = useState<DateGrain>("month");
  const [chartKey, setChartKey] = useState(0);

  const applyFilters = () => {
    let from = fromDraft;
    let to = toDraft;
    if (from && to && from > to) {
      const swap = from;
      from = to;
      to = swap;
      setFromDraft(from);
      setToDraft(to);
    }
    setFromDate(from);
    setToDate(to);
    setGrain(grainDraft);
    setChartKey((k) => k + 1);
  };

  const maintenanceFiltered = useMemo(() => {
    if (!showDateFilter || (!fromDate && !toDate)) return null;
    const costs = data.time_series.maintenance_costs ?? [];
    const rows = costs.filter((c) => inDateRange(c.date, fromDate, toDate));
    const total = rows.reduce((sum, c) => {
      const n = Number(c.cost);
      return Number.isFinite(n) ? sum + n : sum;
    }, 0);
    return { count: rows.length, cost: String(total) };
  }, [showDateFilter, data.time_series.maintenance_costs, fromDate, toDate]);

  return (
    <>
      <KpiRow
        data={data}
        canViewEquipment={canViewEquipment}
        canViewFailures={canViewFailures}
        canViewScheduling={canViewScheduling}
        canViewMaintenance={canViewMaintenance}
        maintenanceCount={maintenanceFiltered?.count}
        maintenanceCost={maintenanceFiltered?.cost}
      />

      {showDateFilter && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Input
            type="date"
            label="Desde"
            value={fromDraft}
            max={toDraft || undefined}
            onChange={(e) => setFromDraft(e.target.value)}
          />
          <Input
            type="date"
            label="Hasta"
            value={toDraft}
            min={fromDraft || undefined}
            onChange={(e) => setToDraft(e.target.value)}
          />
          <Select
            label="Fechas"
            value={grainDraft}
            onChange={(e) => setGrainDraft(e.target.value as DateGrain)}
            options={[
              { value: "day", label: "Día" },
              { value: "month", label: "Mes" },
              { value: "year", label: "Año" },
            ]}
          />
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              onClick={applyFilters}
              className="w-full"
            >
              Aplicar filtros
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {canViewFailures && (
          <FailuresSeverityChart
            data={data.distributions.failures_by_severity}
          />
        )}
      </div>

      {canViewMaintenance &&
        (role === "coordinador" || role === "superadmin") && (
          <CoordinatorSolicitudesChart
            series={data.time_series.schedules ?? []}
            costs={data.time_series.maintenance_costs ?? []}
            fromDate={fromDate}
            toDate={toDate}
            grain={grain}
            chartKey={chartKey}
          />
        )}
      {canViewMaintenance &&
        role !== "coordinador" &&
        role !== "superadmin" && (
          <MaintenanceTimeSeriesChart
            data={data.time_series.maintenance_by_month}
          />
        )}
    </>
  );
}

function CoordinatorSolicitudesChart({
  series,
  costs,
  fromDate,
  toDate,
  grain,
  chartKey,
}: {
  series: { date: string; kind?: string; resolved: boolean }[];
  costs: { date: string; cost: string }[];
  fromDate: string;
  toDate: string;
  grain: DateGrain;
  chartKey: number;
}) {
  const chartData = useMemo(
    () => buildCoordinatorChartData(series, costs, fromDate, toDate, grain),
    [series, costs, fromDate, toDate, grain],
  );

  const hasData = chartData.some(
    (row) => row.Preventivo > 0 || row.Reparación > 0 || row.costo > 0,
  );
  const grainText =
    grain === "year" ? "por año" : grain === "month" ? "por mes" : "por día";

  return (
    <>
      <Card>
        <CardHeader
          title="Solicitudes"
          subtitle={`Cantidad por tipo vs costo de mantenimiento, ${grainText}`}
        />
        <div className="h-72">
          {!hasData ? (
            <p className="py-8 text-center text-sm text-app-muted">
              No hay solicitudes en el rango de fechas.
            </p>
          ) : (
            <ResponsiveContainer
              key={`${fromDate}|${toDate}|${grain}|${chartKey}`}
              width="100%"
              height={256}
              minWidth={0}
            >
              <ComposedChart
                data={chartData}
                barCategoryGap="28%"
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="key"
                  tickFormatter={(value: string) => grainLabel(value, grain)}
                  interval={chartData.length > 14 ? "preserveStartEnd" : 0}
                  minTickGap={8}
                />
                <YAxis
                  yAxisId="count"
                  allowDecimals={false}
                  label={{
                    value: "Cantidad",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 12,
                  }}
                />
                <YAxis
                  yAxisId="cost"
                  orientation="right"
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1000
                        ? `${(v / 1000).toFixed(0)}K`
                        : String(v)
                  }
                />
                <Tooltip
                  labelFormatter={(value) => grainLabel(String(value), grain)}
                  formatter={(value, name) => {
                    if (name === "costo")
                      return [formatCost(Number(value ?? 0)), "Costo"];
                    return [String(value ?? 0), String(name ?? "")];
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="count"
                  dataKey="Preventivo"
                  stackId="kind"
                  fill={KIND_COLOR.PREVENTIVE}
                  maxBarSize={56}
                />
                <Bar
                  yAxisId="count"
                  dataKey="Reparación"
                  stackId="kind"
                  fill={KIND_COLOR.REPAIR}
                  maxBarSize={56}
                />
                <Line
                  yAxisId="cost"
                  type="monotone"
                  dataKey="costo"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </>
  );
}

function BuildAdminChart({
  series,
  costs,
}: {
  series: {date:string; kind?:string; resolved:boolean}[];
  costs: {date:string;cost:string}[];
}) {
  const [fromDate,setFromDate] = useState("");
  const [toDate,setToDate] = useState("");
  const [grain,setGrain] = useState<DateGrain>("month");
  const [chartKey,setChartKey] = useState(0);

  const applyFilters = () => {
    if (!fromDate && fromDate > toDate) {
      setFromDate(toDate);
      setToDate(fromDate);
    }
    setChartKey((k) => k + 1);
  };
  
  const chartData = useMemo(
    () => buildAdministratorChartData(series,costs,fromDate,toDate,grain),
    [series,costs,fromDate,toDate,grain],
  );

  const hasData = chartData.some(
    (row) => row.Preventivo > 0 || row.Reparación > 0 || row.costo > 0,
  );
  const grainText =
    grain === "year" ? "por año" : grain === "month" ? "por mes" : "por día";

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-4">
        <Input
        type="date"
        value="Desde"
        max={toDate || undefined}
        onChange={(e) => setFromDate(e.target.value)}
        />
        <Input
        type="date"
        label="Hasta"
        value={toDate}
        min={fromDate || undefined}
        onChange={(e) => setToDate(e.target.value)}
        />
        <Select 
        label="Fechas"
        value={grain}
        onChange={(e) => setGrain(e.target.value as DateGrain)}
        options={[
          {value:"day",label:"Día"},
          {value:"month",label:"Mes"},
          {value:"year",label:"Año"},
        ]}
        />
        <div className="flex items-end">
          <Button
          type="button"
          variant="secondary"
          onClick={applyFilters}
          className="w-full"
          >
            Aplicar Filtros
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader 
        title="Solicitudes"
        subtitle={`Cantidad por tipo vs costo de mantenimiento, ${grainText}`}
        />
        <div className="h-72">
          {!hasData ? (
            <p className="py-8 text-center text-sm text-app-muted">
              No hay solicitudes en el rango de fechas.
            </p>
          ): (
            <ResponsiveContainer
            key={`${fromDate}|${toDate}|${grain}|${chartKey}`}
            width="100%"
            height={256}
            minWidth={0}
            >
              <ComposedChart
              data={chartData}
              barCategoryGap="28%"
              margin={{top:8,right:8,left:0,bottom:4}}
              >
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis
                dataKey="key"
                tickFormatter={(value:string) => grainLabel(value,grain)}
                interval={chartData.length > 14 ? "preserveStartEnd" :0}
                minTickGap={8}
                />
                <YAxis
                yAxisId="count"
                allowDecimals={false}
                label={{
                  value:"Cantidad",
                  angle:90,
                  position:"insideLeft",
                  fontSize:12,
                }}
                />
                <YAxis
                yAxisId="cost"
                orientation="right"
                tickFormatter={(v:number) =>
                  v >= 1_000_000
                    ? `${(v/1_000_000).toFixed(1)}M`
                    : v >= 1000
                      ? `${(v/1000)}.toFixed(0)|K`
                      : String(v)
                }
                />
                <Tooltip
                labelFormatter={(value) => grainLabel(String(value),grain)}
                formatter={(value,name) => {
                  if (name === "costo")
                    return [formatCost(Number(value ?? 0)),"Costo"];
                  return [String(value ?? 0),String(name ?? "")];
                }}
                />
                <Legend/>
                <Bar
                yAxisId="count"
                dataKey="Preventivo"
                stackId="kind"
                fill={KIND_COLOR.PREVENTIVE}
                maxBarSize={56}
                />
                <Bar
                yAxisId="count"
                dataKey="Reparación"
                stackId="kind"
                fill={KIND_COLOR.REPAIR}
                maxBarSize={56}
                />
                <Line
                yAxisId="cost"
                type="monotone"
                dataKey="costo"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={{r:3}}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </>
  )
} 


function MyTasksSection({
  schedules,
}: {
  schedules: DashboardSummary["my_tasks"]["schedules"];
}) {
  if (schedules.length === 0) return null;
  return (
    <Card>
      <CardHeader
        title="Mis tareas próximas"
        subtitle="Solicitudes asignadas a ti en los próximos 7 días"
      />
      <ul className="divide-y divide-[var(--border)]">
        {schedules.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-3 py-3 text-sm"
          >
            <div>
              <p className="font-medium text-app">{s.equipment_name}</p>
              <p className="text-xs text-app-muted">
                <span className="font-mono">{s.equipment_asset_tag}</span> ·{" "}
                {s.scheduled_date}
              </p>
            </div>
            <Badge tone={s.kind === "PREVENTIVE" ? "info" : "danger"}>
              {s.kind === "PREVENTIVE" ? "Preventivo" : "Reparación"}
            </Badge>
          </li>
        ))}
      </ul>
      <Link
        to="/admin/agendamientos"
        className="mt-3 inline-block text-sm text-[var(--color-primary)] hover:underline"
      >
        Ver todos →
      </Link>
    </Card>
  );
}

function OperativoWeekSection({
  week,
}: {
  week: NonNullable<DashboardSummary["my_week"]>;
}) {
  const kindLabel: Record<string, string> = {
    PREVENTIVE: "Preventivo",
    CORRECTIVE: "Correctivo",
    REPAIR: "Reparación",
    CALIBRATION: "Calibración",
    INSPECTION: "Inspección",
  };
  return (
    <Card>
      <CardHeader
        title="Tus reportes de la semana"
        subtitle={`${week.week_start} → ${week.week_end} · mantenimientos que realizaste, por área`}
      />
      {week.by_area.length === 0 ? (
        <p className="py-6 text-center text-sm text-app-muted">
          Esta semana no hay mantenimientos asignados a ti.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {week.by_area.map((row) => (
              <Badge key={row.area} tone="info">
                {row.area}: {row.count}
              </Badge>
            ))}
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {week.records.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-app">{r.equipment_name}</p>
                  <p className="text-xs text-app-muted">
                    <span className="font-mono">{r.equipment_asset_tag}</span> ·{" "}
                    {r.area} · {r.date}
                  </p>
                </div>
                <Badge tone="neutral">
                  {kindLabel[r.kind] ?? r.kind}
                </Badge>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function KpiRow({
  data,
  canViewEquipment,
  canViewFailures,
  canViewScheduling,
  canViewMaintenance,
  maintenanceCount,
  maintenanceCost,
}: {
  data: DashboardSummary;
  canViewEquipment: boolean;
  canViewFailures: boolean;
  canViewScheduling: boolean;
  canViewMaintenance: boolean;
  maintenanceCount?: number;
  maintenanceCost?: string;
}) {
  const { equipment, failures, scheduling, maintenance } = data.kpis;
  const monthCount = maintenanceCount ?? maintenance.this_month_count;
  const monthCost = maintenanceCost ?? maintenance.this_month_cost;
  const statusBuckets = data.distributions.equipment_by_status;
  const countOf = (status: EquipmentStatus) =>
    statusBuckets.find((row) => row.status === status)?.count ?? 0;
  const statusPie = statusBuckets
    .filter((row) => row.count > 0)
    .map((row) => ({
      status: row.status,
      count: row.count,
      name: STATUS_LABEL[row.status],
    }));
  const cards: Array<{
    label: string;
    value: string;
    delta: string;
    Icon: typeof ClipboardList;
    tone: string;
    show: boolean;
    alert?: boolean;
  }> = [
    {
      label: "Equipos operativos",
      value: String(equipment.active),
      delta: `${countOf("IN_MAINTENANCE")} en mant. · ${countOf("IN_REPAIR")} en repar. · ${countOf("INACTIVE")} fuera`,
      Icon: ClipboardList,
      tone: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",
      show: canViewEquipment,
    },
    {
      label: "Fallas críticas abiertas",
      value: String(failures.critical_open),
      delta: `${failures.total_open} fallas pendientes en total`,
      Icon: AlertTriangle,
      tone:
        failures.critical_open > 0
          ? "text-red-600 bg-red-50 dark:bg-red-950/40"
          : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
      show: canViewFailures,
      alert: failures.critical_open > 0,
    },
    {
      label: "Vencidos",
      value: String(scheduling.overdue),
      delta:
        scheduling.overdue > 0
          ? "Pendientes con fecha de fin vencida"
          : "Sin vencidos",
      Icon: CalendarClock,
      tone:
        scheduling.overdue > 0
          ? "text-red-600 bg-red-50 dark:bg-red-950/40"
          : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
      show: canViewScheduling,
      alert: scheduling.overdue > 0,
    },
    {
      label: "Mantenimientos del mes",
      value: String(monthCount),
      delta: `Costo: ${formatCost(monthCost)}`,
      Icon: Wrench,
      tone: "text-violet-600 bg-violet-50 dark:bg-violet-950/40",
      show: canViewMaintenance,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards
        .filter((c) => c.show)
        .map(({ label, value, delta, Icon, tone, alert }) => (
          <Card key={label} className={alert ? "ring-2 ring-red-200 dark:ring-red-900/60" : ""}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-app-muted">{label}</p>
                <p className="mt-1 text-2xl font-bold text-app">{value}</p>
                <p className="mt-1 text-xs text-app-muted">{delta}</p>
              </div>
              {label === "Equipos operativos" && statusPie.length > 0 ? (
                <div className="h-16 w-16 shrink-0">
                  <ResponsiveContainer width={64} height={64} minWidth={0}>
                    <PieChart>
                      <Pie
                        data={statusPie}
                        dataKey="count"
                        nameKey="name"
                        innerRadius={16}
                        outerRadius={28}
                        paddingAngle={1}
                        stroke="none"
                      >
                        {statusPie.map((row) => (
                          <Cell
                            key={row.status}
                            fill={STATUS_COLOR[row.status]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          String(value ?? 0),
                          String(name ?? ""),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className={`rounded-lg p-2.5 ${tone}`}>
                  <Icon size={20} />
                </div>
              )}
            </div>
          </Card>
        ))}
    </div>
  );
}

function EquipmentStatusChart({ data }: { data: EquipmentStatusBucket[] }) {
  const total = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data]);
  if (total === 0)
    return (
      <Card>
        <CardHeader
          title="Equipos por estado"
          subtitle="Distribución del inventario"
        />
        <p className="py-8 text-center text-sm text-app-muted">
          Sin equipos registrados.
        </p>
      </Card>
    );
  return (
    <Card>
      <CardHeader
        title="Equipos por estado"
        subtitle="Distribución del inventario"
      />
      <div className="h-64">
        <ResponsiveContainer width="100%" height={256} minWidth={0}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
            >
              {data.map((d) => (
                <Cell key={d.status} fill={STATUS_COLOR[d.status]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => {
                const status = (item?.payload?.status ?? "") as EquipmentStatus;
                return [String(value), STATUS_LABEL[status] ?? status];
              }}
            />
            <Legend
              formatter={(value) =>
                STATUS_LABEL[value as EquipmentStatus] ?? value
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function FailuresSeverityChart({ data }: { data: FailureSeverityBucket[] }) {
  const total = useMemo(
    () => data.reduce((s, d) => s + d.open + d.resolved, 0),
    [data],
  );
  if (total === 0)
    return (
      <Card>
        <CardHeader
          title="Fallas por severidad"
          subtitle="Abiertas vs resueltas"
        />
        <p className="py-8 text-center text-sm text-app-muted">
          Sin fallas reportadas.
        </p>
      </Card>
    );
  const chartData = data.map((d) => ({
    severity: SEVERITY_LABEL[d.severity],
    severityKey: d.severity,
    Abiertas: d.open,
    Resueltas: d.resolved,
  }));
  return (
    <Card>
      <CardHeader
        title="Fallas por severidad"
        subtitle="Abiertas vs resueltas"
      />
      <div className="h-64">
        <ResponsiveContainer width="100%" height={256} minWidth={0}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="severity" width={70} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Abiertas" stackId="a" fill="#ef4444">
              {chartData.map((d) => (
                <Cell key={d.severityKey} fill={SEVERITY_COLOR[d.severityKey]} />
              ))}
            </Bar>
            <Bar dataKey="Resueltas" stackId="a" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function MaintenanceTimeSeriesChart({
  data,
}: {
  data: MaintenanceMonthBucket[];
}) {
  const chartData = data.map((d) => ({
    month: MonthLabel({ month: d.month }),
    Preventivo: d.PREVENTIVE,
    Correctivo: d.CORRECTIVE,
    Reparación: d.REPAIR,
    Calibración: d.CALIBRATION,
    Inspección: d.INSPECTION,
    costo: Number(d.cost),
  }));
  return (
    <Card>
      <CardHeader
        title="Mantenimientos últimos 6 meses"
        subtitle="Cantidad por tipo y costo total mensual"
      />
      <div className="h-72">
        <ResponsiveContainer width="100%" height={256} minWidth={0}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis
              yAxisId="count"
              allowDecimals={false}
              label={{
                value: "Cantidad",
                angle: -90,
                position: "insideLeft",
                fontSize: 12,
              }}
            />
            <YAxis
              yAxisId="cost"
              orientation="right"
              tickFormatter={(v: number) =>
                v >= 1_000_000
                  ? `${(v / 1_000_000).toFixed(1)}M`
                  : v >= 1000
                    ? `${(v / 1000).toFixed(0)}K`
                    : String(v)
              }
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === "costo")
                  return [formatCost(Number(value ?? 0)), "Costo"];
                return [String(value ?? 0), String(name ?? "")];
              }}
            />
            <Legend />
            <Bar
              yAxisId="count"
              dataKey="Preventivo"
              stackId="kind"
              fill={KIND_COLOR.PREVENTIVE}
            />
            <Bar
              yAxisId="count"
              dataKey="Correctivo"
              stackId="kind"
              fill={KIND_COLOR.CORRECTIVE}
            />
            <Bar
              yAxisId="count"
              dataKey="Reparación"
              stackId="kind"
              fill={KIND_COLOR.REPAIR}
            />
            <Bar
              yAxisId="count"
              dataKey="Calibración"
              stackId="kind"
              fill={KIND_COLOR.CALIBRATION}
            />
            <Bar
              yAxisId="count"
              dataKey="Inspección"
              stackId="kind"
              fill={KIND_COLOR.INSPECTION}
            />
            <Line
              yAxisId="cost"
              type="monotone"
              dataKey="costo"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function OverdueSchedulesList({
  items,
}: {
  items: DashboardSummary["lists"]["overdue_schedules"];
}) {
  return (
    <Card>
      <CardHeader
        title="Solicitudes vencidas"
        subtitle="Programadas cuya fecha ya pasó"
        action={
          items.length > 0 ? (
            <Link
              to="/admin/agendamientos"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              Ver todos →
            </Link>
          ) : undefined
        }
      />
      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-app-muted">
          <CheckCircle2
            size={28}
            className="mx-auto mb-2 text-emerald-500"
          />
          No hay solicitudes vencidas.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-app">{it.equipment_name}</p>
                <p className="text-xs text-app-muted">
                  <span className="font-mono">{it.equipment_asset_tag}</span> ·
                  Programado para {it.scheduled_date}
                </p>
              </div>
              <Badge tone="danger">{it.days_overdue} d</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function WorstMtbfList({
  items,
}: {
  items: DashboardSummary["lists"]["worst_mtbf"];
}) {
  return (
    <Card>
      <CardHeader
        title="Equipos con peor confiabilidad"
        subtitle="Menor MTBF entre los que tienen 2+ fallas"
      />
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-app-muted">
          Aún no hay suficientes datos.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <div>
                <p className="flex items-center gap-1.5 font-medium text-app">
                  <Activity size={14} className="text-amber-500" />
                  {it.name}
                </p>
                <p className="text-xs text-app-muted">
                  <span className="font-mono">{it.asset_tag}</span> ·{" "}
                  {it.branch_name} · {it.failures_count} fallas
                </p>
              </div>
              <span className="text-sm font-semibold text-app">
                {formatHours(it.mtbf_hours)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
