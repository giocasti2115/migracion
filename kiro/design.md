# Diseño Técnico: Migración Plataforma ZIRIUZ

## Overview

Migración de la plataforma ZIRIUZ desde un monolito PHP/MySQL hacia una arquitectura moderna basada en Next.js 14 App Router con TypeScript. La nueva plataforma mantiene todos los módulos y submódulos existentes, incorpora autenticación JWT con refresh tokens, gestión de sesiones robusta (una sesión activa por usuario), un dashboard interactivo con mapa de Colombia por departamentos y visualizaciones de métricas en tiempo real.

**Stack tecnológico:**

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Framework | Next.js 14 (App Router) | SSR/SSG, file-based routing, Server Actions |
| Lenguaje | TypeScript 5 | Tipado estático, mejor DX |
| UI Components | shadcn/ui + Radix UI | Accesible, personalizable |
| Estilos | Tailwind CSS 3 | Utility-first, consistencia de diseño |
| Auth | NextAuth.js v5 (Auth.js) | JWT + refresh tokens, sesión única por usuario |
| ORM | Prisma 5 | Type-safe, migraciones, compatible MySQL |
| Base de datos | MySQL 8 (existente) | Reutilizar esquema actual |
| Cache/Sesiones | Redis | Almacén de refresh tokens, rate limiting |
| Mapa | react-simple-maps + D3 | SVG Colombia por departamentos |
| Charts | Recharts 2 | Composable, responsive, React-native |
| Tablas | TanStack Table v8 | Virtualización, sorting, filtering server-side |
| Estado servidor | TanStack Query v5 | Cache, revalidación, optimistic updates |
| Estado cliente | Zustand | Estado UI ligero |
| PDF | @react-pdf/renderer | Generación PDF en cliente/servidor |
| Email | Nodemailer + React Email | Templates HTML para correos |
| Validación | Zod | Schemas compartidos cliente/servidor |
| Testing | Vitest + Testing Library + fast-check | Unit, integration, property-based |

---

## Architecture

### Visión General del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                     │
│              Next.js 14 App Router (SSR/CSR)                │
│         Tailwind CSS + shadcn/ui + Recharts + Maps          │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / REST / Server Actions
┌──────────────────────────▼──────────────────────────────────┐
│                    NEXT.JS API LAYER                         │
│              /api/* Route Handlers (Edge/Node)              │
│         NextAuth.js v5 · Middleware de autorización         │
└──────────────────────────┬──────────────────────────────────┘
                           │ Prisma ORM
┌──────────────────────────▼──────────────────────────────────┐
│                    BASE DE DATOS                             │
│                  MySQL 8 (existente)                         │
│          + Redis (refresh tokens / rate limiting)           │
└─────────────────────────────────────────────────────────────┘
```

### Estructura de Directorios

```
ziriuz-v2/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── cambiar-clave/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Layout con sidebar + header
│   │   ├── page.tsx              # Dashboard home
│   │   ├── solicitudes/
│   │   ├── ordenes/
│   │   ├── visitas/
│   │   ├── preventivos/
│   │   ├── cotizaciones/
│   │   ├── equipos/
│   │   ├── clientes/
│   │   ├── sedes/
│   │   ├── informes/
│   │   ├── administracion/
│   │   └── catalogos/
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── dashboard/
│       ├── solicitudes/
│       ├── ordenes/
│       ├── visitas/
│       ├── preventivos/
│       ├── cotizaciones/
│       ├── equipos/
│       ├── clientes/
│       ├── sedes/
│       ├── usuarios/
│       ├── informes/
│       └── catalogos/
├── components/
│   ├── ui/                       # shadcn/ui base components
│   ├── layout/                   # Sidebar, Header, Breadcrumb
│   ├── dashboard/                # MapaColombia, KPICard, Charts
│   ├── data-table/               # DataTable genérico TanStack
│   ├── forms/                    # Formularios por módulo
│   └── shared/
├── lib/
│   ├── auth.ts
│   ├── prisma.ts
│   ├── redis.ts
│   ├── validations/
│   └── utils.ts
├── hooks/
├── types/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── middleware.ts
```

### Módulos y Navegación

| Menú | Submódulos | Roles con acceso |
|------|-----------|-----------------|
| **Dashboard** | Home (mapa + KPIs + charts) | Todos |
| **Solicitudes** | Pendientes, Aprobadas, Rechazadas, Todas | Admin, Analista, Coordinador, Técnico |
| **Órdenes** | Abiertas, Cerradas, Todas | Admin, Analista, Coordinador, Técnico |
| **Visitas** | Pendientes, Abiertas, Cerradas, Calendario | Admin, Analista, Coordinador, Técnico |
| **Preventivos** | Lista, Nuevo, Descargar | Admin, Analista, Coordinador |
| **Cotizaciones** | Borrador, Aprobadas, Rechazadas, Todas | Admin, Comercial, Analista |
| **Equipos** | Lista, Nuevo, Solicitar Baja | Admin, Analista, Coordinador |
| **Clientes** | Lista, Nuevo | Admin, Analista |
| **Sedes** | Lista, Nuevo | Admin, Analista |
| **Informes** | Correctivos, Repuestos, Indicadores | Admin, Analista, Coordinador |
| **Administración** | Usuarios, Administradores, Analistas, Técnicos, Coordinadores, Comerciales, Permisos | Admin |
| **Catálogos** | Marcas, Modelos, Clases, Áreas, Tipos, Estados, Fallas, Repuestos, Protocolos, Actividades, Servicios | Admin |

### Flujo de Autenticación y Sesiones

```
Login Request
     │
     ▼
Validar credenciales (bcrypt)
     │
     ▼
Revocar sesiones anteriores del usuario (una sesión por usuario)
     │
     ▼
Crear registro en tabla sesiones
     │
     ├─► Generar Access Token JWT (15 min, RS256)
     │       payload: { sub: userId, sessionId, role, sedes[] }
     │
     └─► Generar Refresh Token (cuid, 7 días)
             Guardar en tabla refresh_tokens
             Setear httpOnly cookie "refresh_token"
             Setear httpOnly cookie "access_token"

Cada request protegido:
     │
     ▼
middleware.ts verifica Access Token
     │
     ├─ Válido → continuar
     └─ Expirado → llamar /api/auth/refresh
                        │
                        ▼
                   Verificar Refresh Token (no revocado, no expirado)
                        │
                        ▼
                   Rotar: revocar token anterior, emitir nuevo par
                        │
                        ▼
                   Retornar nuevas cookies httpOnly

Logout:
     │
     ▼
Revocar refresh token en BD
Marcar sesión como inactiva
Limpiar cookies
```

### Dashboard Home — Layout

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: Logo | Breadcrumb | Notificaciones | Avatar        │
├──────────────┬──────────────────────────────────────────────┤
│              │  KPI CARDS (4 columnas)                      │
│   SIDEBAR    │  [Órdenes Abiertas] [Solicitudes Pend.]      │
│              │  [Visitas Hoy]      [Cotizaciones Act.]      │
│  Dashboard   ├──────────────────────────────────────────────┤
│  Solicitudes │  ┌─────────────────┐  ┌────────────────────┐ │
│  Órdenes     │  │  MAPA COLOMBIA  │  │  ÓRDENES POR MES   │ │
│  Visitas     │  │  (SVG por dept) │  │  (BarChart/Line)   │ │
│  Preventivos │  │  hover: tooltip │  └────────────────────┘ │
│  Cotizaciones│  │  click: detalle │  ┌────────────────────┐ │
│  Equipos     │  └─────────────────┘  │  DIST. SERVICIOS   │ │
│  Clientes    │                       │  (PieChart)        │ │
│  Sedes       │  ┌─────────────────┐  └────────────────────┘ │
│  Informes    │  │  TOP EQUIPOS    │                         │
│  Admin       │  │  CORRECTIVOS    │                         │
│  Catálogos   │  │  (HorizontalBar)│                         │
│              │  └─────────────────┘                         │
└──────────────┴──────────────────────────────────────────────┘
```

---

## Components and Interfaces

### DataTable Genérico

```typescript
// components/data-table/DataTable.tsx
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  totalCount: number
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  columnFilters: ColumnFiltersState
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>
  isLoading?: boolean
  actions?: ActionConfig<TData>[]
  onExportExcel?: () => void
  onExportPDF?: () => void
}
```

### Componente Mapa Colombia

```typescript
// components/dashboard/MapaColombia.tsx
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps"
import { scaleQuantile } from "d3-scale"

const GEO_URL = "/geo/colombia-departamentos.json"

interface OrdenPorDepartamento {
  codigoDane: string
  nombre: string
  totalOrdenes: number
  ordenesAbiertas: number
}

export function MapaColombia({ datos }: { datos: OrdenPorDepartamento[] }) {
  const colorScale = scaleQuantile<string>()
    .domain(datos.map(d => d.totalOrdenes))
    .range(["#dcfce7", "#86efac", "#4ade80", "#16a34a", "#14532d"])

  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ scale: 2000, center: [-74, 4] }}
    >
      <ZoomableGroup>
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const dato = datos.find(d => d.codigoDane === geo.properties.DPTO)
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={dato ? colorScale(dato.totalOrdenes) : "#f1f5f9"}
                  stroke="#cbd5e1"
                  strokeWidth={0.5}
                  style={{
                    hover: { fill: "#3b82f6", cursor: "pointer" },
                    pressed: { fill: "#1d4ed8" }
                  }}
                />
              )
            })
          }
        </Geographies>
      </ZoomableGroup>
    </ComposableMap>
  )
}
```

### Componentes de Charts

```typescript
// OrdenesPorMesChart — BarChart con Recharts
interface OrdenMensual { mes: string; abiertas: number; cerradas: number }

// DistribucionServiciosChart — PieChart con Recharts
interface ServicioConteo { servicio: string; total: number }

// TopEquiposChart — HorizontalBarChart con Recharts
interface EquipoCorrectivo { equipo: string; correctivos: number; costoTotal: number }

// DisponibilidadChart — BarChart apilado por cliente
interface DisponibilidadCliente { cliente: string; disponibilidad: number }
```

### Configuración NextAuth.js v5

```typescript
// lib/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import { compare } from "bcryptjs"
import { loginSchema } from "./validations/auth"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const usuario = await prisma.usuario.findUnique({
          where: { usuario: parsed.data.usuario, activo: true },
          include: {
            administrador: true, analista: true,
            tecnico: true, coordinador: true, comercial: true,
          }
        })
        if (!usuario) return null

        const passwordOk = await compare(parsed.data.clave, usuario.clave)
        if (!passwordOk) return null

        await revocarSesionesAnteriores(usuario.id)
        const sesion = await crearSesion(usuario.id)

        return {
          id: String(usuario.id),
          name: usuario.nombre,
          email: usuario.correo,
          sessionId: sesion.id,
          role: determinarRol(usuario),
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.sessionId = user.sessionId
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.userId as string
      session.user.sessionId = token.sessionId as number
      session.user.role = token.role as string
      return session
    }
  },
  session: { strategy: "jwt", maxAge: 15 * 60 },
  pages: { signIn: "/login" }
})
```

### Middleware de Autorización

```typescript
// middleware.ts
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { PERMISOS_RUTA } from "@/lib/permisos"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (pathname.startsWith("/login") || pathname.startsWith("/cambiar-clave")) {
    if (session) return NextResponse.redirect(new URL("/", req.url))
    return NextResponse.next()
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const permiso = PERMISOS_RUTA[pathname]
  if (permiso && !permiso.includes(session.user.role)) {
    return NextResponse.redirect(new URL("/no-autorizado", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"]
}
```

### API Route — Patrón REST (Órdenes)

```typescript
// app/api/ordenes/route.ts
export async function GET(request: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const query = ordenesQuerySchema.parse(Object.fromEntries(searchParams))

  const sedesFilter = session.user.role !== "admin"
    ? await getSedesRelacionadas(Number(session.user.id))
    : undefined

  const [data, total] = await prisma.$transaction([
    prisma.orden.findMany({
      where: buildOrdenesWhere(query, sedesFilter),
      include: {
        solicitud: {
          include: {
            equipo: {
              include: {
                sede: { include: { municipio: { include: { departamento: true } }, cliente: true } },
                modelo: { include: { clase: true, marca: true } },
                area: true,
              }
            },
            servicio: true,
          }
        },
        estado: true,
        subEstado: true,
      },
      orderBy: { creacion: "desc" },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    }),
    prisma.orden.count({ where: buildOrdenesWhere(query, sedesFilter) })
  ])

  return Response.json({ data, total, page: query.page, pageSize: query.pageSize })
}
```

### Refresh Token — Rotación Automática

```typescript
// app/api/auth/refresh/route.ts
export async function POST() {
  const cookieStore = cookies()
  const oldRefreshToken = cookieStore.get("refresh_token")?.value

  if (!oldRefreshToken) {
    return Response.json({ error: "No refresh token" }, { status: 401 })
  }

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: oldRefreshToken, revocado: false },
    include: { usuario: true }
  })

  if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
    return Response.json({ error: "Token inválido o expirado" }, { status: 401 })
  }

  // Rotación: revocar el anterior, emitir nuevo par
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revocado: true }
  })

  const newAccessToken = await signAccessToken(tokenRecord.usuario)
  const newRefreshToken = await signRefreshToken(tokenRecord.idUsuario)

  const response = Response.json({ ok: true })
  cookieStore.set("access_token", newAccessToken, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 15 * 60
  })
  cookieStore.set("refresh_token", newRefreshToken.token, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60
  })

  return response
}
```

---

## Data Models

### Entidades Principales (Prisma Schema)

```prisma
model Usuario {
  id          Int      @id @default(autoincrement())
  usuario     String   @unique
  nombre      String
  cedula      String?
  correo      String?
  telefonos   String?
  clave       String   // bcrypt hash
  activo      Boolean  @default(true)
  createdAt   DateTime @default(now())

  administrador  Administrador?
  analista       Analista?
  tecnico        Tecnico?
  coordinador    Coordinador?
  comercial      Comercial?
  sesiones       Sesion[]
  refreshTokens  RefreshToken[]
  vsClientes     UsuarioVsCliente[]
  vsSedes        UsuarioVsSede[]
}

model Sesion {
  id         Int      @id @default(autoincrement())
  idUsuario  Int
  creacion   DateTime @default(now())
  activa     Boolean  @default(true)
  usuario    Usuario  @relation(fields: [idUsuario], references: [id])
}

model RefreshToken {
  id         String   @id @default(cuid())
  token      String   @unique
  idUsuario  Int
  expiresAt  DateTime
  revocado   Boolean  @default(false)
  createdAt  DateTime @default(now())
  usuario    Usuario  @relation(fields: [idUsuario], references: [id])
}

model Orden {
  id                  Int       @id @default(autoincrement())
  idSolicitud         Int
  idEstado            Int
  idSubEstado         Int?
  idCreador           Int
  idCerrador          Int?
  creacion            DateTime  @default(now())
  cierre              DateTime?
  total               Decimal?
  observacionesCierre String?
  solicitud           Solicitud   @relation(fields: [idSolicitud], references: [id])
  estado              OrdenEstado @relation(fields: [idEstado], references: [id])
  visitas             Visita[]
  cotizaciones        Cotizacion[]
}

model Solicitud {
  id                Int       @id @default(autoincrement())
  idEquipo          Int
  idServicio        Int
  idCreador         Int
  idEstado          Int
  aviso             String?
  observacion       String?
  observacionEstado String?
  creacion          DateTime  @default(now())
  equipo            Equipo    @relation(fields: [idEquipo], references: [id])
  ordenes           Orden[]
}

model Sede {
  id          Int     @id @default(autoincrement())
  nombre      String
  idCliente   Int
  idMunicipio Int
  direccion   String?
  telefonos   String?
  correo      String?
  activo      Boolean @default(true)
  cliente     Cliente    @relation(fields: [idCliente], references: [id])
  municipio   Municipio  @relation(fields: [idMunicipio], references: [id])
  equipos     Equipo[]
}

model Municipio {
  id             Int    @id @default(autoincrement())
  nombre         String
  idDepartamento Int
  departamento   Departamento @relation(fields: [idDepartamento], references: [id])
  sedes          Sede[]
}

model Departamento {
  id         Int         @id @default(autoincrement())
  nombre     String
  codigo     String      @unique  // código DANE para mapa SVG
  municipios Municipio[]
}
```

### Endpoint Dashboard — Datos del Mapa

```typescript
// app/api/dashboard/mapa/route.ts
const datos = await prisma.$queryRaw<OrdenPorDepartamento[]>`
  SELECT
    d.codigo   AS codigoDane,
    d.nombre   AS nombre,
    COUNT(o.id) AS totalOrdenes,
    SUM(CASE WHEN oe.id = 1 THEN 1 ELSE 0 END) AS ordenesAbiertas
  FROM ordenes o
  JOIN solicitudes s ON s.id = o.id_solicitud
  JOIN equipos e ON e.id = s.id_equipo
  JOIN sedes se ON se.id = e.id_sede
  JOIN municipios m ON m.id = se.id_municipio
  JOIN departamentos d ON d.id = m.id_departamento
  JOIN ordenes_estados oe ON oe.id = o.id_estado
  WHERE o.creacion >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
  GROUP BY d.id, d.codigo, d.nombre
  ORDER BY totalOrdenes DESC
`
```

---

## Correctness Properties

Las siguientes propiedades deben mantenerse en todo momento y son verificables mediante property-based testing con fast-check:

### Property 1: Sesión única por usuario

Para cualquier usuario activo, después de un login exitoso, existe exactamente una sesión activa en BD (`COUNT(sesiones WHERE activa=true AND id_usuario=X) === 1`).

**Validates: Requirements 1.1**

### Property 2: Refresh token revocado siempre retorna 401

Para cualquier refresh token revocado, el endpoint `/api/auth/refresh` siempre retorna HTTP 401, sin importar cuántas veces se intente.

**Validates: Requirements 1.2**

### Property 3: Access token expirado sin refresh válido redirige a login

Para cualquier access token expirado sin refresh token válido, el middleware siempre redirige a `/login`.

**Validates: Requirements 1.3**

### Property 4: Aislamiento de roles

Un usuario con rol `tecnico` nunca puede acceder a rutas del módulo `administracion`, independientemente de los parámetros de la solicitud.

**Validates: Requirements 1.4**

### Property 5: Filtrado de datos por sedes relacionadas

Para cualquier usuario no-admin, la lista de órdenes retornada solo contiene órdenes de sedes relacionadas a ese usuario.

**Validates: Requirements 2.1**

### Property 6: Consistencia del mapa de Colombia

Para cualquier departamento en el mapa, `totalOrdenes >= ordenesAbiertas` (las abiertas son un subconjunto del total).

**Validates: Requirements 3.1**

### Property 7: Días fuera siempre no negativos

Para cualquier orden, `diasFuera = DATEDIFF(cierre ?? NOW(), solicitud.creacion) >= 0`.

**Validates: Requirements 4.1**

### Property 8: Integridad solicitud-orden

Para cualquier solicitud en estado aprobado, existe exactamente una orden asociada.

**Validates: Requirements 4.2**

### Property 9: Integridad referencial cotizaciones

Para cualquier cotización, `idCliente` siempre referencia un cliente existente y activo.

**Validates: Requirements 5.1**

### Property 10: Validez temporal de refresh tokens

Para cualquier refresh token en BD, `expiresAt > createdAt`.

**Validates: Requirements 1.2**

```typescript
// tests/properties/auth.property.test.ts
import fc from "fast-check"
import { describe, it, expect } from "vitest"

describe("P1: login resulta en exactamente una sesión activa", () => {
  it("una sesión activa por usuario tras múltiples logins", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 100 }), async (loginCount) => {
        // Arrange: usuario válido en BD de test
        // Act: login loginCount veces
        // Assert: COUNT(sesiones WHERE activa=true AND id_usuario=X) === 1
        const count = await prisma.sesion.count({
          where: { idUsuario: testUserId, activa: true }
        })
        return count === 1
      })
    )
  })
})
```

---

## Error Handling

### Estrategia Global

- **Errores de autenticación (401):** Redirigir a `/login`, limpiar cookies
- **Errores de autorización (403):** Mostrar página `/no-autorizado` con mensaje descriptivo
- **Errores de validación (400):** Retornar errores Zod formateados al cliente, mostrar en formulario
- **Errores de servidor (500):** Log en servidor, mostrar mensaje genérico al usuario sin exponer detalles
- **Errores de red:** TanStack Query maneja reintentos automáticos (3 intentos con backoff exponencial)
- **Refresh token expirado:** Redirigir a login con mensaje "Sesión expirada, por favor inicia sesión nuevamente"

### Patrones de Manejo

```typescript
// Patrón API Route con manejo de errores
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "No autorizado" }, { status: 401 })

    const data = await fetchData()
    return Response.json(data)
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "Datos inválidos", details: error.flatten() }, { status: 400 })
    }
    console.error("[API Error]", error)
    return Response.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
```

---

## Testing Strategy

### Niveles de Testing

| Nivel | Herramienta | Cobertura objetivo |
|-------|------------|-------------------|
| Unit | Vitest | Funciones puras, validaciones Zod, utilidades |
| Integration | Vitest + Prisma test DB | API routes, servicios de BD |
| Component | Testing Library + Vitest | Componentes React, formularios |
| Property-Based | fast-check | Propiedades de corrección P1-P10 |
| E2E | Playwright | Flujos críticos: login, crear orden, dashboard |

### Estructura de Tests

```
tests/
├── unit/
│   ├── auth/           # signAccessToken, verifyToken, determinarRol
│   ├── validations/    # Schemas Zod
│   └── utils/
├── integration/
│   ├── api/            # Route handlers con BD de test
│   └── services/       # Servicios de sesión, tokens
├── components/
│   ├── dashboard/      # MapaColombia, KPICard, Charts
│   └── data-table/     # DataTable con datos mock
├── properties/
│   ├── auth.property.test.ts    # P1-P4
│   ├── data.property.test.ts    # P5-P7
│   └── integrity.property.test.ts # P8-P10
└── e2e/
    ├── auth.spec.ts
    ├── ordenes.spec.ts
    └── dashboard.spec.ts
```

### Estrategia de Migración

**Fases de implementación:**
1. Infraestructura base: Setup Next.js, Prisma, Auth, layout, middleware
2. Dashboard: Mapa Colombia, KPIs, charts principales
3. Módulos operativos: Solicitudes, Órdenes, Visitas (core del negocio)
4. Módulos de soporte: Preventivos, Cotizaciones, Equipos, Clientes, Sedes
5. Informes y exportaciones: Correctivos, repuestos, indicadores, PDF, Excel
6. Administración y catálogos: Usuarios, roles, permisos, catálogos
7. QA y migración de datos: Tests, migración BD, cutover

**Compatibilidad de BD:** Prisma se conecta al MySQL existente. Se agregan tablas nuevas (`departamentos`, `refresh_tokens`) con migraciones aditivas únicamente. Script de migración de contraseñas: hash bcrypt de las claves existentes.
