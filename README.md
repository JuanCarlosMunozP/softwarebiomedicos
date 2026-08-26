# PBioSoft

Sistema de Gestión de Equipos Biomédicos: inventario de equipos, mantenimiento
preventivo/correctivo, fallas, agendamiento y usuarios por sede, para una
clínica. El repo tiene tres proyectos independientes que comparten una misma
API:

| Carpeta | Qué es | Stack |
|---|---|---|
| [`biometric_api/`](biometric_api) | Backend / API REST | Django + DRF + Postgres + Redis/Celery |
| [`FrontEquiposBiometricos/`](FrontEquiposBiometricos) | Frontend web (panel admin) | React + Vite + TypeScript |
| [`EbMobile/`](EbMobile) | App móvil (réplica funcional del web) | React Native + Expo |

Cada carpeta tiene su propio README/documentación con el detalle de
instalación, variables de entorno y scripts — este archivo es solo el mapa de
cómo encajan las tres piezas y cómo levantarlas juntas en local.

## Arquitectura

```
                      ┌─────────────────────┐
                      │   biometric_api      │
                      │   Django + DRF        │
                      │   :8000               │
                      └─────┬──────────┬─────┘
                            │          │
                 cookies httpOnly   Bearer token
                    (mismo origen)   (header Authorization)
                            │          │
              ┌─────────────┘          └─────────────┐
              ▼                                       ▼
  ┌───────────────────────┐              ┌───────────────────────┐
  │ FrontEquiposBiometricos│              │       EbMobile         │
  │  React + Vite (web)    │              │  React Native + Expo   │
  │  :5173 (proxy /api)    │              │                        │
  └───────────────────────┘              └───────────────────────┘
```

El backend expone una única API en `/api/v1/`, pero autentica a cada cliente
de forma distinta (ver [`biometric_api/api/v1/common/authentication.py`](biometric_api/api/v1/common/authentication.py)):

- **Web**: login devuelve el JWT como cookies `httpOnly` (no accesibles desde
  JS, protección contra robo por XSS). En dev, el proxy de Vite hace que
  frontend y backend compartan origen; en prod, nginx cumple ese mismo rol.
- **Móvil**: login clásico, el JWT viaja en el header `Authorization: Bearer`
  y se guarda en `expo-secure-store` (Keychain/EncryptedSharedPreferences).

`FrontEquiposBiometricos` y `EbMobile` son intencionalmente una "réplica
funcional" el uno del otro (mismas reglas de negocio, permisos por rol y
normalización de errores) — ver el porqué en
[`EbMobile/DOCUMENTACION.md`](EbMobile/DOCUMENTACION.md#13-reuso-de-conocimiento-del-web).
Como consecuencia, `src/types/` y `src/services/` están duplicados a mano
entre ambos proyectos. Para que esa duplicación no se desincronice con el
contrato real de la API, el backend expone su schema OpenAPI y ambos
frontends pueden regenerar sus tipos desde ahí — ver
["Tipos generados desde el schema OpenAPI"](#tipos-generados-desde-el-schema-openapi).

## Levantar todo en local

```bash
# 1. Backend (Postgres + Redis + Django)
cd biometric_api
cp .env.example .env
docker compose up -d
# -> API en http://localhost:8000, docs en http://localhost:8000/api/docs/

# 2. Frontend web
cd ../FrontEquiposBiometricos
cp .env.example .env
pnpm install && pnpm dev
# -> http://127.0.0.1:5173 (el proxy de Vite habla con :8000)

# 3. App móvil (en otra terminal, opcional)
cd ../EbMobile
cp .env.example .env   # ajustar la IP según simulador/emulador/dispositivo físico
npm install && npm start
```

Cada subproyecto documenta sus variables de entorno en su propio
`.env.example`; la única realmente distinta entre web y móvil es la URL base
de la API (relativa + proxy en web, absoluta en móvil — ver el `.env.example`
de `EbMobile` para las variantes según simulador/emulador/dispositivo físico).

## Documentación por proyecto

- **Backend**: [`biometric_api/docs/postman/`](biometric_api/docs/postman) (colección Postman) y Swagger/Redoc en
  `/api/docs/` y `/api/redoc/` con el servidor corriendo.
- **Web**: [`FrontEquiposBiometricos/README.md`](FrontEquiposBiometricos/README.md)
- **Móvil**: [`EbMobile/DOCUMENTACION.md`](EbMobile/DOCUMENTACION.md) (documento técnico extendido, incluye el porqué de cada decisión de stack)

## Tipos generados desde el schema OpenAPI

`biometric_api` expone su schema OpenAPI (drf-spectacular). En vez de que
cada frontend le pegue a un backend corriendo para generar tipos, el schema
queda **versionado como archivo** en
[`biometric_api/docs/openapi-schema.yaml`](biometric_api/docs/openapi-schema.yaml)
— así regenerar tipos en el frontend no depende de tener Docker levantado, y
el propio `openapi-schema.yaml` sirve como diff legible del contrato de la
API en cada PR que toque el backend.

Cuando cambias algo en `biometric_api` (un modelo, un serializer, una vista),
regeneras ese archivo:

```bash
cd biometric_api
docker compose up -d          # o cualquier entorno con el venv activo
docker compose exec web python manage.py spectacular \
  --file docs/openapi-schema.yaml --settings=config.settings.dev
```

Y luego, en cada frontend, regeneras sus tipos a partir de ese archivo (no
necesita el backend corriendo, solo el `.yaml` actualizado):

```bash
cd FrontEquiposBiometricos && npm run generate:api-types
cd EbMobile && npm run generate:api-types
```

Esto produce `src/types/api-schema.d.ts` en cada proyecto (versionado en git,
igual que el schema). Los tipos escritos a mano en `src/types/*.ts` **no se
reemplazaron** por esto — es una herramienta para ir migrando gradualmente y,
mientras tanto, para detectar en revisión de código cuándo un cambio del
backend afecta a los frontends, sin depender de acordarse de actualizar los
dos a mano.

> Nota: 3 endpoints basados en `APIView` sin `serializer_class`
> (`CookieTokenLogoutView`, `CookieTokenRefreshView`, `DashboardSummaryView`)
> no tienen tipado fino en el schema todavía — drf-spectacular hace fallback
> genérico para esos. Se puede refinar con `@extend_schema` si en algún
> momento hace falta el tipo exacto ahí.
