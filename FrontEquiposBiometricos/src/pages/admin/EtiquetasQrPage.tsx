import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Printer, RefreshCw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/context/AuthContext";
import { can } from "@/lib/permissions";
import { equipmentService } from "@/services/equipment.service";
import { branchesService } from "@/services/branches.service";
import { getApiErrorMessage } from "@/lib/api";
import type { Equipment } from "@/types/equipment";
import type { Branch } from "@/types/branch";

const COLUMN_OPTIONS = [
  { value: "2", label: "2 por fila (grandes)" },
  { value: "3", label: "3 por fila" },
  { value: "4", label: "4 por fila (pequeñas)" },
];

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function buildPrintHtml(items: Equipment[], columns: number): string {
  const labels = items
    .map((eq) => {
      const sede = [eq.branch_name, eq.location].filter(Boolean).join(" · ");
      const modelo = [eq.brand_name, eq.equipment_model_name]
        .filter(Boolean)
        .join(" ");
      const qr = eq.qr_code_url
        ? `<img src="${escapeHtml(eq.qr_code_url)}" alt="QR ${escapeHtml(eq.asset_tag)}" />`
        : `<div class="noqr">Sin QR</div>`;
      return `
        <div class="label">
          <div class="qr">${qr}</div>
          <div class="meta">
            <p class="name">${escapeHtml(eq.name)}</p>
            <p class="tag">${escapeHtml(eq.asset_tag)}</p>
            ${modelo ? `<p class="sub">${escapeHtml(modelo)}</p>` : ""}
            ${sede ? `<p class="sub">${escapeHtml(sede)}</p>` : ""}
          </div>
        </div>`;
    })
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Etiquetas QR de equipos</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .sheet {
    display: grid;
    grid-template-columns: repeat(${columns}, 1fr);
    gap: 8px;
    padding: 10mm;
  }
  .label {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid #111;
    border-radius: 6px;
    padding: 8px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .qr { flex: 0 0 auto; }
  .qr img { display: block; width: ${columns >= 4 ? 70 : columns === 3 ? 90 : 120}px; height: auto; }
  .noqr {
    width: ${columns >= 4 ? 70 : columns === 3 ? 90 : 120}px; height: ${columns >= 4 ? 70 : columns === 3 ? 90 : 120}px;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; color: #999; border: 1px dashed #ccc;
  }
  .meta { min-width: 0; }
  .name { margin: 0; font-size: ${columns >= 4 ? 10 : 12}px; font-weight: 700; line-height: 1.2; }
  .tag { margin: 2px 0 0; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: ${columns >= 4 ? 12 : 15}px; font-weight: 700; }
  .sub { margin: 1px 0 0; font-size: ${columns >= 4 ? 8 : 9}px; color: #444; line-height: 1.2; }
  @page { margin: 8mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="sheet">${labels}</div>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.focus(); window.print(); }, 300);
    });
  </script>
</body>
</html>`;
}

export function EtiquetasQrPage() {
  const { usuario } = useAuth();
  const canRegenerate = can(usuario?.role, "equipment", "edit");

  const [items, setItems] = useState<Equipment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [columns, setColumns] = useState("3");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true);
    setError(null);
    try {
      const [eq, brs] = await Promise.all([
        equipmentService.listAll({ ordering: "name" }),
        branchesService.list({ ordering: "name" }),
      ]);
      setBranches(brs);
      setItems((prev) => {
        if (opts.silent) {
          // Refresco en segundo plano: respetamos lo que el usuario deseleccionó
          // y marcamos por defecto los equipos nuevos (recién creados) para que
          // aparezcan listos para imprimir.
          const knownIds = new Set(prev.map((e) => e.id));
          const newIds = eq.filter((e) => !knownIds.has(e.id)).map((e) => e.id);
          if (newIds.length) {
            setSelected((sel) => new Set([...sel, ...newIds]));
            setNotice(
              `${newIds.length} equipo(s) nuevo(s) agregado(s) al panel.`,
            );
          }
        } else {
          setSelected(new Set(eq.map((e) => e.id)));
        }
        return eq;
      });
    } catch (err) {
      if (!opts.silent) {
        setError(getApiErrorMessage(err, "No se pudieron cargar los equipos"));
      }
    } finally {
      if (!opts.silent) setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  // Al volver a la pestaña, refrescamos en silencio: si se creó un equipo
  // en otra vista, su etiqueta QR aparece sin recargar la página.
  useEffect(() => {
    const onFocus = () => void load({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((eq) => {
      if (branchFilter && String(eq.branch) !== branchFilter) return false;
      if (!q) return true;
      return (
        eq.name.toLowerCase().includes(q) ||
        eq.asset_tag.toLowerCase().includes(q) ||
        (eq.equipment_model_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, branchFilter]);

  const toPrint = useMemo(
    () => filtered.filter((eq) => selected.has(eq.id)),
    [filtered, selected],
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((eq) => selected.has(eq.id));

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((eq) => next.delete(eq.id));
      else filtered.forEach((eq) => next.add(eq.id));
      return next;
    });
  };

  const print = () => {
    if (toPrint.length === 0) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      setNotice("El navegador bloqueó la ventana de impresión. Habilita los pop-ups.");
      return;
    }
    win.document.write(buildPrintHtml(toPrint, Number(columns)));
    win.document.close();
  };

  const regenerateAll = async () => {
    setRegenerating(true);
    setNotice(null);
    setError(null);
    try {
      const { regenerated } = await equipmentService.regenerateQrAll();
      await load();
      setNotice(`Se regeneraron ${regenerated} códigos QR.`);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron regenerar los QR"));
    } finally {
      setRegenerating(false);
    }
  };

  const gridCols =
    columns === "2"
      ? "sm:grid-cols-2"
      : columns === "4"
        ? "sm:grid-cols-3 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-app sm:text-3xl">Etiquetas QR</h1>
          <p className="text-sm text-app-muted">
            Genera e imprime los códigos QR de los equipos. Al escanearlos se
            abre la hoja de vida del equipo (previo inicio de sesión).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            leftIcon={<RotateCw size={16} />}
            onClick={() => void load({ silent: true })}
          >
            Actualizar
          </Button>
          {canRegenerate && (
            <Button
              variant="secondary"
              leftIcon={<RefreshCw size={16} />}
              loading={regenerating}
              onClick={() => void regenerateAll()}
            >
              Regenerar QR de todos
            </Button>
          )}
          <Button
            leftIcon={<Printer size={16} />}
            disabled={toPrint.length === 0}
            onClick={print}
          >
            Imprimir ({toPrint.length})
          </Button>
        </div>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          {notice}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <Card>
        <div className="grid gap-2 sm:grid-cols-4">
          <Input
            placeholder="Buscar nombre, tag o modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="Todas las sedes"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
          />
          <Select
            value={columns}
            onChange={(e) => setColumns(e.target.value)}
            options={COLUMN_OPTIONS}
          />
          <Button variant="secondary" onClick={toggleAllFiltered}>
            {allFilteredSelected ? "Quitar selección" : "Seleccionar todos"}
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card>
          <p className="py-10 text-center text-sm text-app-muted">Cargando...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm text-app-muted">
            No hay equipos con los filtros actuales.
          </p>
        </Card>
      ) : (
        <div className={`grid grid-cols-1 gap-3 ${gridCols}`}>
          {filtered.map((eq) => {
            const isSelected = selected.has(eq.id);
            return (
              <label
                key={eq.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                  isSelected
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                    : "border-app bg-surface hover:bg-app-muted/50"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isSelected}
                  onChange={() => toggle(eq.id)}
                />
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-app bg-white p-1">
                  {eq.qr_code_url ? (
                    <img
                      src={eq.qr_code_url}
                      alt={`QR ${eq.asset_tag}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-center text-[10px] text-app-muted">
                      Sin QR
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-app">
                    {eq.name}
                  </p>
                  <p className="font-mono text-sm font-bold text-app">
                    {eq.asset_tag}
                  </p>
                  <p className="truncate text-xs text-app-muted">
                    {[eq.branch_name, eq.location].filter(Boolean).join(" · ")}
                  </p>
                  <Link
                    to={`/admin/equipos/${eq.id}`}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver hoja de vida
                  </Link>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
