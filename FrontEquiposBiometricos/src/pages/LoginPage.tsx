import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getApiErrorMessage } from "@/lib/api";
import { panelHome } from "@/lib/permissions";
import { PUBLIC_REGISTRATION_ENABLED } from "@/lib/featureFlags";

const features = [
  {
    title: "Hojas de vida",
    desc: "Registro completo y actualizado de cada equipo biomédico.",
  },
  {
    title: "Mantenimientos preventivos y correctivos",
    desc: "Programa, ejecuta y documenta intervenciones técnicas.",
  },
  {
    title: "Reportes y trazabilidad",
    desc: "Consulta el estado e historial de cada equipo en tiempo real.",
  },
  {
    title: "Usuarios y roles",
    desc: "Control de acceso por rol dentro de la clínica.",
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // La URL pretendida (ej. la hoja de vida al escanear un QR sin sesión)
  // llega por `state.from` (ProtectedRoute) o por `?next=` (el interceptor
  // de api.ts cuando expira la sesión). Sólo respetamos rutas internas.
  const fromState = (location.state as { from?: string } | null)?.from;
  const fromQuery = new URLSearchParams(location.search).get("next");
  const target = fromState ?? fromQuery ?? "";
  const explicitRedirect =
    typeof target === "string" && target.startsWith("/") && !target.startsWith("//")
      ? target
      : null;

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = await login(formData);
      navigate(explicitRedirect ?? panelHome(u.role), { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Credenciales inválidas"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* PANEL IZQUIERDO — Branding (oculto en móvil) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#d71920] via-[#b2141a] to-[#7a0d12] p-12 text-white lg:flex">
        <div className="relative z-10 max-w-lg pr-4">
          <div className="inline-flex items-center gap-4 rounded-xl bg-white px-4 py-3 shadow-lg">
            <img
              src="/icons/logo-clinica.png"
              alt="Clínica Pabón"
              className="h-20 w-auto"
            />
            <span className="h-16 w-px shrink-0 bg-gray-200" aria-hidden />
            <img
              src="/icons/logo-centro-pabon.png"
              alt="Centro de Cuidados Cardioneurovasculares Pabón S.A.S."
              className="h-20 w-auto"
            />
          </div>

          <h1 className="mt-8 text-[11px] font-medium uppercase tracking-[0.22em] text-white/80">
            Gestión de equipos biomédicos
          </h1>
          <p className="mt-4 text-[2.75rem] font-bold italic leading-[1.1] tracking-tight text-white">
            Trabajamos con el corazón
          </p>

          <ul className="mt-6 max-w-xs space-y-2.5">
            {features.map((f) => (
              <li key={f.title} className="flex gap-2.5">
                <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/20 text-[9px] font-medium">
                  ✓
                </span>
                <div>
                  <p className="text-[13px] font-medium tracking-wide text-white">
                    {f.title}
                  </p>
                  <p className="mt-0.5 text-[11px] font-normal leading-relaxed tracking-wide text-white/75">
                    {f.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/70">
          © {new Date().getFullYear()} Clínica Pabón — Todos los derechos
          reservados.
        </p>

        <img
          src="/images/paboncitobiomedico.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -bottom-4 -right-4 h-80 w-80 select-none object-contain opacity-95 drop-shadow-2xl"
        />
      </aside>

      {/* PANEL DERECHO — Formulario */}
      <section className="flex items-center justify-center bg-app p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-app-muted transition hover:text-[var(--color-primary)]"
            >
              <ArrowLeft size={14} />
              Volver al inicio
            </Link>
            <ThemeToggle />
          </div>

          {/* Logo en móvil */}
          <div className="mb-8 flex justify-center lg:hidden">
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <img
                src="/icons/logo-clinica.png"
                alt="Clínica Pabón"
                className="h-16 w-auto"
              />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-app">Bienvenido</h2>
            <p className="mt-2 text-sm text-app-muted">
              Ingresa tus credenciales para acceder al sistema.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Usuario"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="usuario"
              value={formData.username}
              onChange={handleChange}
              leftIcon={<UserIcon size={16} />}
              required
            />
            <Input
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              leftIcon={<Lock size={16} />}
              required
            />

            <Button type="submit" loading={loading} fullWidth size="lg" className="mt-2">
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </Button>
          </form>

          <div className="mt-6 flex flex-col items-start gap-2 text-sm">
            <Link
              to="/recuperar-password"
              className="text-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
            {PUBLIC_REGISTRATION_ENABLED ? (
              <Link
                to="/registro"
                className="text-primary hover:underline"
              >
                ¿No tienes cuenta? Solicitar registro
              </Link>
            ) : (
              <p className="text-app-muted">
                ¿No tienes cuenta? El registro de nuevos usuarios lo realiza un
                administrador.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
