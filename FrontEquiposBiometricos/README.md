# PBioSoft — Frontend Web

Frontend web del **Sistema de Gestión de Equipos Biomédicos**: aplicación para administrar el
inventario de equipos biomédicos de una clínica, su mantenimiento preventivo/correctivo,
fallas reportadas, agendamiento y usuarios por sede.

Consume la API REST de [`biometric_api`](../biometric_api) (Django). Existe además una
réplica funcional para móvil en [`EbMobile`](../EbMobile) (React Native / Expo) que
comparte los mismos servicios, tipos y reglas de permisos.

## Stack técnico

- **React 19** + **TypeScript** (`strict`, sin `any` en el código de la app)
- **Vite 7** como bundler y dev server
- **React Router 7** para las rutas
- **Tailwind CSS 4** para estilos
- **Axios** para el cliente HTTP, con interceptores para CSRF y refresh de sesión
- **Recharts** para las gráficas del dashboard
- **ESLint** + `typescript-eslint` para lint

## Estructura del proyecto

```
src/
├── components/     # UI reutilizable (ui/, layout/, equipment/)
├── context/        # AuthContext, ThemeContext, NotificationContext
├── lib/            # cliente axios (api.ts), permisos, feature flags, websocket
├── pages/          # páginas públicas y del panel admin (pages/admin/)
├── routes/         # ProtectedRoute (guard de autenticación/roles)
├── services/       # una función por recurso de la API (equipment, users, ...)
└── types/          # tipos TypeScript que reflejan los serializers del backend
```

## Requisitos previos

- Node.js 20+
- [pnpm](https://pnpm.io/) (el repo trae `pnpm-lock.yaml`; también funciona con npm)
- La API corriendo en local — ver el README de [`biometric_api`](../biometric_api)
  (por defecto en `http://127.0.0.1:8000`)

## Configuración

```bash
cp .env.example .env
```

| Variable            | Descripción                                                                 |
|---------------------|------------------------------------------------------------------------------|
| `VITE_API_BASE_URL` | Base de la API. En dev debe quedar **relativa** (`/api/v1`, valor por defecto) |

> **Importante:** `VITE_API_BASE_URL` debe ser relativa y no apuntar directo a
> `http://127.0.0.1:8000`. La sesión viaja en cookies `httpOnly`, y si el navegador ve
> el frontend y la API en orígenes distintos (puertos distintos cuentan), algunos
> navegadores bloquean esas cookies. En dev, el proxy de Vite (`vite.config.ts`) resuelve
> esto sirviendo `/api` y `/ws` bajo el mismo origen que el frontend; en producción,
> nginx cumple el mismo rol. No pongas variables sensibles con prefijo `VITE_`: Vite las
> empaqueta tal cual en el bundle público del navegador.

## Puesta en marcha

```bash
pnpm install
pnpm dev
```

La app queda en `http://127.0.0.1:5173`. Con la API corriendo en `http://127.0.0.1:8000`,
el proxy de Vite reenvía automáticamente `/api/*` y `/ws/*` hacia el backend.

## Scripts disponibles

| Comando         | Qué hace                                              |
|-----------------|--------------------------------------------------------|
| `pnpm dev`      | Levanta el servidor de desarrollo con hot-reload       |
| `pnpm build`    | Type-check (`tsc -b`) + build de producción a `dist/`  |
| `pnpm lint`     | Corre ESLint sobre todo el proyecto                    |
| `pnpm preview`  | Sirve localmente el build de `dist/` para verificarlo  |

## Autenticación

El login se hace contra `POST /api/v1/auth/token/cookie/`, que responde con el access y
el refresh token como cookies `httpOnly` (no en el body). El frontend nunca guarda tokens
en `localStorage`; el interceptor de Axios en [`src/lib/api.ts`](src/lib/api.ts) se encarga de:

- adjuntar el header `X-CSRFToken` (double-submit cookie) en cada `POST`/`PUT`/`PATCH`/`DELETE`,
- refrescar la sesión automáticamente ante un `401` y reintentar la petición original,
- redirigir a `/login` si el refresh también falla.

Los permisos por rol (qué puede ver/crear/editar/eliminar cada rol) viven en
[`src/lib/permissions.ts`](src/lib/permissions.ts) y deben mantenerse en sincronía con las
reglas del backend (son una ayuda de UI, la autorización real la sigue validando la API).

## Build de producción

```bash
pnpm build
```

Genera `dist/`, pensado para ser servido por nginx bajo el mismo origen que `/api/`. Para
ese entorno, crea un `.env.production` (no está versionado) con el mismo
`VITE_API_BASE_URL=/api/v1` relativo — el detalle de por qué debe ser relativo está en
la sección de Configuración arriba.

## Proyectos relacionados

- [`biometric_api`](../biometric_api) — API REST en Django que consume este frontend
- [`EbMobile`](../EbMobile) — app móvil (React Native/Expo) equivalente a este frontend
