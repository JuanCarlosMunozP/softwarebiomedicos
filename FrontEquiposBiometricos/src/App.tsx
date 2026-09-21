import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { PUBLIC_REGISTRATION_ENABLED } from "@/lib/featureFlags";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { RegistroPage } from "@/pages/RegistroPage";
import { RecuperarPasswordPage } from "@/pages/RecuperarPasswordPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { DashboardPage } from "@/pages/admin/dashboard/DashboardPage";
import { SedesPage } from "@/pages/admin/equipment/SedesPage";
import { EquiposPage } from "@/pages/admin/equipment/EquiposPage";
import { EquipoDetallePage } from "@/pages/admin/equipment/EquipoDetallePage";
import { EtiquetasQrPage } from "@/pages/admin/equipment/EtiquetasQrPage";
import { UsuariosPage } from "@/pages/admin/users/UsuariosPage";
import { MantenimientosPage } from "@/pages/admin/maintenance/MantenimientosPage";
import { OrdenesTrabajoPage } from "@/pages/admin/equipment/workorders/OrdenesTrabajoPage";
import { AgendamientosPage } from "@/pages/admin/scheduling/AgendamientosPage";
import { FallasPage } from "@/pages/admin/failures/FallasPage";
import { PerfilPage } from "@/pages/admin/PerfilPage";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            {/* Último recurso: si revienta un layout, un provider de ruta o
                una página de login (que no van dentro de MainLayout), evita
                la pantalla en blanco total. */}
            <ErrorBoundary scope="app">
              <Routes>
                {/* Páginas de autenticación sin layout */}
                <Route path="/login" element={<LoginPage />} />
                {/* Registro público deshabilitado por el momento: solo un
                    administrador crea cuentas (Admin → Usuarios). Si se accede
                    por URL directa, se redirige al login. */}
                <Route
                  path="/registro"
                  element={
                    PUBLIC_REGISTRATION_ENABLED ? (
                      <RegistroPage />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
                <Route
                  path="/recuperar-password"
                  element={<RecuperarPasswordPage />}
                />

                {/* Layout público — incluye también la 404 para que el header
                    permita volver al inicio o al panel desde cualquier URL rota. */}
                <Route element={<MainLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/404" element={<NotFoundPage />} />
                </Route>

                {/* Layout interno común a todos los roles autenticados.
                    Cada vista filtra contenido y acciones por permisos. */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<DashboardPage />} />

                    {/* Sedes: solo quien puede verlas en el backend. El
                        técnico no tiene el recurso "branches" → se le
                        redirige al panel en vez de mostrarle un error 403. */}
                    <Route
                      element={
                        <ProtectedRoute
                          roles={[
                            "superadmin",
                            "admin",
                            "coordinador",
                            "ingeniero",
                          ]}
                        />
                      }
                    >
                      <Route path="sedes" element={<SedesPage />} />
                    </Route>

                    <Route
                      element={
                        <ProtectedRoute
                          roles={[
                            "superadmin",
                            "admin",
                            "coordinador",
                            "ingeniero",
                            "tecnico",
                          ]}
                        />
                      }
                    >
                      <Route path="equipos" element={<EquiposPage />} />
                      <Route path="equipos/:id" element={<EquipoDetallePage />} />
                    </Route>
                    <Route
                      element={
                        <ProtectedRoute
                          roles={[
                            "superadmin",
                            "admin",
                            "coordinador",
                            "ingeniero",
                          ]}
                        />
                      }
                    >
                      <Route
                        path="equipos/etiquetas"
                        element={<EtiquetasQrPage />}
                      />
                    </Route>
                    {/* Solicitudes: gestión + operativo + usuario +
                        ingeniero (solo consulta). */}
                    <Route
                      element={
                        <ProtectedRoute
                          roles={[
                            "superadmin",
                            "admin",
                            "coordinador",
                            "ingeniero",
                            "tecnico",
                            "usuario",
                          ]}
                        />
                      }
                    >
                      <Route
                        path="agendamientos"
                        element={<AgendamientosPage />}
                      />
                    </Route>
                    <Route
                      element={
                        <ProtectedRoute
                          roles={[
                            "superadmin",
                            "admin",
                            "coordinador",
                            "ingeniero",
                            "tecnico",
                          ]}
                        />
                      }
                    >
                      <Route path="fallas" element={<FallasPage />} />
                    </Route>
                    <Route path="perfil" element={<PerfilPage />} />

                    {/* Historial de mantenimientos: registrar/editar es
                        exclusivo del coordinador; el superadmin lo consulta. */}
                    <Route
                      element={
                        <ProtectedRoute roles={["superadmin", "coordinador"]} />
                      }
                    >
                      <Route
                        path="mantenimientos"
                        element={<MantenimientosPage />}
                      />
                    </Route>

                    {/* Órdenes de trabajo: gestión ve todas; el ingeniero
                        solo las suyas ("Tareas asignadas"). */}
                    <Route
                      element={
                        <ProtectedRoute
                          roles={[
                            "superadmin",
                            "admin",
                            "coordinador",
                            "ingeniero",
                          ]}
                        />
                      }
                    >
                      <Route
                        path="ordenes-trabajo"
                        element={<OrdenesTrabajoPage />}
                      />
                    </Route>

                    <Route
                      element={
                        <ProtectedRoute roles={["superadmin", "admin"]} />
                      }
                    >
                      <Route path="usuarios" element={<UsuariosPage />} />
                    </Route>
                  </Route>
                </Route>

                {/* Rutas /tecnico/* siguen llegando: redirigimos al panel unificado */}
                <Route
                  path="/tecnico/*"
                  element={<Navigate to="/admin" replace />}
                />

                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
