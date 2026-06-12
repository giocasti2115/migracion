# Implementation Plan: Ziriuz Platform Migration

## Overview

Migración incremental del monolito PHP/MySQL a Next.js 14 App Router + TypeScript. Las tareas siguen las 7 fases del diseño: infraestructura base → dashboard → módulos operativos → módulos de soporte → informes/exportaciones → administración/catálogos → QA/migración de datos. Cada tarea construye sobre la anterior y termina con integración funcional.

## Tasks

- [x] 1. Infraestructura base: proyecto, base de datos y autenticación
  - [x] 1.1 Inicializar proyecto Next.js 14 con TypeScript y configurar dependencias
    - Crear proyecto con `create-next-app` usando App Router y TypeScript
    - Instalar y configurar Tailwind CSS 3, shadcn/ui, Radix UI
    - Instalar Prisma 5, NextAuth.js v5, Zod, TanStack Query v5, Zustand
    - Instalar Vitest, Testing Library, fast-check, Playwright
    - Configurar `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`
    - _Requirements: 15.1_

  - [x] 1.2 Configurar Prisma con el esquema MySQL existente y modelos nuevos
    - Conectar Prisma al MySQL existente con `DATABASE_URL`
    - Definir modelos `Usuario`, `Sesion`, `RefreshToken`, `Departamento`, `Municipio`, `Sede`, `Cliente`, `Equipo`, `Solicitud`, `Orden`, `Visita`, `Preventivo`, `Cotizacion` en `schema.prisma`
    - Crear migración aditiva para tablas nuevas (`departamentos`, `refresh_tokens`, `sesiones`)
    - Crear `lib/prisma.ts` con singleton del cliente Prisma
    - _Requirements: 1.1, 1.2, 4.2, 5.1_

  - [x] 1.3 Configurar Redis y utilidades de tokens
    - Instalar `ioredis` y crear `lib/redis.ts` con cliente singleton
    - Implementar `lib/auth-tokens.ts`: `signAccessToken` (RS256, 15 min), `signRefreshToken` (cuid, 7 días), `verifyAccessToken`
    - Implementar `lib/session-manager.ts`: `crearSesion`, `revocarSesionesAnteriores`, `revocarSesion`
    - _Requirements: 1.1, 1.2, 1.7, 1.9_

  - [x] 1.4 Implementar NextAuth.js v5 con proveedor Credentials
    - Crear `lib/auth.ts` con configuración completa: proveedor Credentials, callbacks `jwt` y `session`, estrategia JWT 15 min
    - Implementar `authorize`: validar con `loginSchema` (Zod), verificar bcrypt, revocar sesiones anteriores, crear sesión nueva
    - Crear `app/api/auth/[...nextauth]/route.ts`
    - Implementar `app/api/auth/refresh/route.ts` con rotación de tokens (revocar anterior, emitir nuevo par, httpOnly cookies)
    - Implementar `app/api/auth/logout/route.ts`: revocar refresh token, marcar sesión inactiva, limpiar cookies
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 1.8, 1.9_

  - [x] 1.5 Implementar middleware de autorización y protección de rutas
    - Crear `middleware.ts` con verificación de sesión NextAuth
    - Implementar `lib/permisos.ts` con mapa `PERMISOS_RUTA` por rol
    - Redirigir a `/login` si no autenticado; redirigir a `/no-autorizado` si rol insuficiente
    - Redirigir a dashboard si usuario autenticado accede a `/login` o `/cambiar-clave`
    - _Requirements: 1.4, 1.5, 1.10, 1.11, 2.2, 2.4_

  - [x] 1.6 Escribir property tests P1, P2, P3, P4 para autenticación y sesiones
    - **Property 1: Sesión única por usuario** — tras N logins, `COUNT(sesiones WHERE activa=true AND idUsuario=X) === 1`
    - **Validates: Requirements 1.1**
    - **Property 2: Refresh token revocado retorna 401** — cualquier token revocado siempre retorna HTTP 401
    - **Validates: Requirements 1.2, 1.3**
    - **Property 3: Access token expirado sin refresh válido redirige a /login**
    - **Validates: Requirements 1.3, 1.4**
    - **Property 4: Aislamiento de roles** — usuario `tecnico` nunca accede a rutas `/administracion`
    - **Validates: Requirements 1.4, 2.4**
    - Crear `tests/properties/auth.property.test.ts` con fast-check
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.7 Crear layout principal con sidebar, header y páginas de auth
    - Crear `app/(auth)/login/page.tsx` con formulario de login (Zod + react-hook-form)
    - Crear `app/(auth)/cambiar-clave/page.tsx`
    - Crear `app/(dashboard)/layout.tsx` con sidebar responsivo y header (logo, breadcrumb, notificaciones, avatar)
    - Crear `components/layout/Sidebar.tsx`, `Header.tsx`, `Breadcrumb.tsx` con navegación filtrada por rol
    - Crear página `/no-autorizado`
    - _Requirements: 1.5, 1.10, 1.11, 2.2, 2.4_

  - [x] 1.8 Escribir unit tests para auth-tokens y session-manager
    - Testear `signAccessToken`, `verifyAccessToken`, `signRefreshToken`
    - Testear `crearSesion`, `revocarSesionesAnteriores`
    - Testear `determinarRol` con todos los roles posibles
    - _Requirements: 1.1, 1.2, 1.6_

- [x] 2. Checkpoint — Verificar infraestructura base
  - Asegurar que todos los tests pasen, preguntar al usuario si hay dudas.


- [x] 3. Dashboard: mapa de Colombia, KPIs y charts
  - [x] 3.1 Implementar API endpoints del dashboard con filtrado por sedes
    - Crear `app/api/dashboard/kpis/route.ts`: retornar Órdenes Abiertas, Solicitudes Pendientes, Visitas Hoy, Cotizaciones Activas con `Data_Scope_Filter` por sedes del usuario
    - Crear `app/api/dashboard/mapa/route.ts`: query raw SQL agrupando órdenes por departamento (últimos 12 meses, código DANE)
    - Crear `app/api/dashboard/charts/route.ts`: órdenes por mes, distribución por servicio, top equipos correctivos, disponibilidad por cliente
    - Implementar `lib/data-scope-filter.ts`: `getSedesRelacionadas(userId)` para filtrar por sedes asignadas
    - _Requirements: 2.1, 2.3, 2.5, 3.2, 3.6, 3.7_

  - [x] 3.2 Escribir property test P5 y P6 para filtrado de datos y consistencia del mapa
    - **Property 5: Filtrado de datos por sedes** — para cualquier usuario no-admin, la lista de órdenes solo contiene órdenes de sedes asignadas
    - **Validates: Requirements 2.1, 2.3**
    - **Property 6: Consistencia del mapa** — para todo departamento, `totalOrdenes >= ordenesAbiertas`
    - **Validates: Requirements 3.1**
    - Crear `tests/properties/data.property.test.ts` con fast-check
    - _Requirements: 2.1, 3.1_

  - [x] 3.3 Implementar componente MapaColombia con react-simple-maps
    - Crear `components/dashboard/MapaColombia.tsx` con `ComposableMap`, `ZoomableGroup`, `Geographies`
    - Agregar GeoJSON de Colombia por departamentos en `public/geo/colombia-departamentos.json`
    - Implementar escala de color cuantil con d3-scale (5 rangos de verde)
    - Implementar tooltip en hover (nombre, totalOrdenes, ordenesAbiertas) y panel drill-down en click
    - Departamentos con `totalOrdenes = 0` reciben fill gris neutro
    - _Requirements: 3.3, 3.4, 3.5_

  - [x] 3.4 Implementar KPI cards y charts del dashboard
    - Crear `components/dashboard/KPICard.tsx` con skeleton loading
    - Crear `components/dashboard/OrdenesPorMesChart.tsx` (BarChart Recharts: abiertas vs cerradas)
    - Crear `components/dashboard/DistribucionServiciosChart.tsx` (PieChart Recharts)
    - Crear `components/dashboard/TopEquiposChart.tsx` (HorizontalBarChart Recharts)
    - Crear `components/dashboard/DisponibilidadChart.tsx` (BarChart apilado por cliente)
    - _Requirements: 3.2, 3.6_

  - [x] 3.5 Ensamblar página dashboard con TanStack Query y manejo de errores
    - Crear `app/(dashboard)/page.tsx` con layout de 4 KPI cards + mapa + charts
    - Usar TanStack Query para fetching independiente de cada sección
    - Mostrar indicador de error inline por sección fallida sin bloquear el resto
    - _Requirements: 3.2, 3.6, 3.8_

  - [x] 3.6 Escribir component tests para MapaColombia y KPICard
    - Testear renderizado del mapa con datos mock
    - Testear tooltip en hover y panel en click
    - Testear KPICard con valores cero y valores altos
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint — Verificar dashboard funcional
  - Asegurar que todos los tests pasen, preguntar al usuario si hay dudas.


- [x] 5. Componente DataTable genérico con TanStack Table
  - [x] 5.1 Implementar DataTable genérico con paginación, sorting y filtros server-side
    - Crear `components/data-table/DataTable.tsx` con interfaz `DataTableProps<TData, TValue>`
    - Implementar paginación, sorting y `columnFilters` ejecutados en servidor (no cargar todos los registros en cliente)
    - Implementar toggle de visibilidad de columnas con persistencia en `sessionStorage`
    - Implementar resaltado de filas cuando valor supera umbral configurado por columna
    - Implementar agrupación de filas por columna con header de grupo y conteo
    - _Requirements: 12.1, 12.2, 12.5, 12.6_

  - [x] 5.2 Implementar exportación Excel y PDF desde DataTable
    - Agregar botones "Exportar Excel" y "Exportar PDF" al DataTable
    - Implementar `lib/export/excel.ts` con `xlsx` para generar archivo Excel (máx 10,000 filas, filtros actuales)
    - Implementar `lib/export/pdf-table.ts` con `@react-pdf/renderer` para generar PDF tabular (máx 10,000 filas)
    - _Requirements: 12.3, 12.4_

  - [x] 5.3 Escribir unit tests para DataTable
    - Testear paginación, sorting y filtros con datos mock
    - Testear toggle de visibilidad de columnas
    - Testear resaltado de filas por umbral
    - _Requirements: 12.1, 12.2, 12.5_

- [x] 6. Módulo Solicitudes
  - [x] 6.1 Implementar API de Solicitudes con filtrado por sedes y sub-vistas
    - Crear `app/api/solicitudes/route.ts` (GET con paginación/sorting/filtros, POST crear)
    - Crear `app/api/solicitudes/[id]/route.ts` (GET detalle, PATCH actualizar estado)
    - Implementar `buildSolicitudesWhere` con filtro por estado y `Data_Scope_Filter`
    - Crear schemas Zod: `solicitudQuerySchema`, `crearSolicitudSchema`, `actualizarEstadoSchema`
    - _Requirements: 4.3, 4.4, 4.5, 15.1, 15.2_

  - [x] 6.2 Implementar transición Pendiente → Aprobada con creación atómica de Orden
    - En `PATCH /api/solicitudes/[id]`: cuando estado destino es `Aprobada`, usar `prisma.$transaction` para actualizar solicitud y crear orden en una sola operación
    - Validar que la solicitud esté en estado `Pendiente` antes de aprobar
    - Implementar transición a `Rechazada` persistiendo motivo de rechazo
    - _Requirements: 4.2, 4.4, 4.5_

  - [x] 6.3 Escribir property test P7 y P8 para diasFuera e integridad solicitud-orden
    - **Property 7: diasFuera siempre no negativo** — `DATEDIFF(cierre ?? NOW(), solicitud.creacion) >= 0`
    - **Validates: Requirements 4.1**
    - **Property 8: Integridad solicitud-orden** — toda solicitud aprobada tiene exactamente una orden
    - **Validates: Requirements 4.2**
    - Agregar a `tests/properties/data.property.test.ts`
    - _Requirements: 4.1, 4.2_

  - [x] 6.4 Implementar páginas UI de Solicitudes con sub-vistas
    - Crear `app/(dashboard)/solicitudes/layout.tsx` con tabs: Pendientes, Aprobadas, Rechazadas, Todas
    - Crear páginas por sub-vista usando DataTable genérico con columnas de solicitud
    - Crear `components/forms/SolicitudForm.tsx` con validación Zod client-side
    - Implementar acciones de aprobar/rechazar con modal de confirmación y campo de motivo
    - _Requirements: 4.3, 4.4, 4.5, 15.3, 15.4_

- [x] 7. Módulo Órdenes
  - [x] 7.1 Implementar API de Órdenes con filtrado por sedes y operaciones de ciclo de vida
    - Crear `app/api/ordenes/route.ts` (GET con paginación/sorting/filtros server-side)
    - Crear `app/api/ordenes/[id]/route.ts` (GET detalle, PATCH cerrar/reabrir/anular)
    - Implementar `buildOrdenesWhere` con `Data_Scope_Filter` y cálculo de `diasFuera`
    - Implementar cierre: registrar timestamp, idCerrador, observacionesCierre
    - Implementar reapertura: limpiar timestamp de cierre, restaurar estado Abierta
    - Implementar anulación: transición a Anulada, rechazar modificaciones posteriores
    - _Requirements: 4.1, 4.6, 4.7, 4.8, 4.9, 15.1, 15.2_

  - [x] 7.2 Implementar exportación ZIP y firma digital de órdenes
    - Crear `app/api/ordenes/[id]/zip/route.ts`: empaquetar documentos e imágenes en ZIP descargable
    - Crear `components/shared/SignaturePad.tsx` con canvas para captura de firma
    - Crear `app/api/ordenes/[id]/firma/route.ts`: persistir imagen de firma vinculada a la orden
    - _Requirements: 4.10, 4.11, 13.3_

  - [x] 7.3 Implementar páginas UI de Órdenes con sub-vistas
    - Crear `app/(dashboard)/ordenes/layout.tsx` con tabs: Abiertas, Cerradas, Todas
    - Crear páginas por sub-vista usando DataTable genérico con columnas de orden y `diasFuera`
    - Implementar acciones de cerrar/reabrir/anular con modales de confirmación
    - Integrar botón de firma digital y descarga ZIP en vista de detalle
    - _Requirements: 4.6, 4.7, 4.8, 4.9, 4.10, 4.11_

  - [x] 7.4 Escribir unit tests para lógica de ciclo de vida de órdenes
    - Testear transiciones de estado válidas e inválidas
    - Testear cálculo de `diasFuera` con fechas de cierre y sin cierre
    - Testear rechazo de modificaciones en órdenes anuladas
    - _Requirements: 4.1, 4.7, 4.8, 4.9_


- [x] 8. Módulo Visitas
  - [x] 8.1 Implementar API de Visitas con máquina de estados y validaciones
    - Crear `app/api/visitas/route.ts` (GET con paginación/filtros, POST crear)
    - Crear `app/api/visitas/[id]/route.ts` (GET detalle, PATCH transición de estado)
    - Implementar máquina de estados: Pendiente → Aprobada → Abierta → Cerrada; rechazar transiciones inválidas con error descriptivo
    - Validar que motivo de rechazo no supere 500 caracteres; observaciones de cierre no superen 1000 caracteres
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.7, 15.1, 15.2_

  - [x] 8.2 Implementar páginas UI de Visitas con sub-vistas y calendario
    - Crear `app/(dashboard)/visitas/layout.tsx` con tabs: Pendientes, Abiertas, Cerradas, Calendario
    - Crear páginas de lista por sub-vista usando DataTable genérico
    - Crear `app/(dashboard)/visitas/calendario/page.tsx` con vista de calendario mensual (visitas activas por fecha programada)
    - Implementar acciones de aprobar/rechazar/ejecutar/cerrar con modales y validación de longitud
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 8.3 Escribir unit tests para máquina de estados de visitas
    - Testear todas las transiciones válidas
    - Testear rechazo de transiciones inválidas con mensaje de error
    - Testear validación de longitud de motivo y observaciones
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.7_

- [x] 9. Checkpoint — Verificar módulos operativos core
  - Asegurar que todos los tests pasen, preguntar al usuario si hay dudas.

- [x] 10. Módulo Preventivos
  - [x] 10.1 Implementar API de Preventivos con validación de campos requeridos
    - Crear `app/api/preventivos/route.ts` (GET con paginación, POST crear)
    - Crear `app/api/preventivos/[id]/route.ts` (GET detalle, PATCH actualizar)
    - Validar en creación: equipo asociado, fecha programada, al menos una actividad o protocolo
    - Crear schema Zod `crearPreventivoSchema` con validaciones requeridas
    - _Requirements: 7.2, 15.1, 15.2_

  - [x] 10.2 Implementar generación PDF de preventivos
    - Crear `app/api/preventivos/[id]/pdf/route.ts` usando `@react-pdf/renderer`
    - Incluir: título, código, versión, fecha programada, actividades y protocolos asociados, logo y header/footer
    - Retornar error si la generación falla; nunca entregar archivo parcial o vacío
    - _Requirements: 7.3, 7.4, 14.2, 14.4, 14.5_

  - [x] 10.3 Implementar páginas UI de Preventivos
    - Crear `app/(dashboard)/preventivos/layout.tsx` con tabs: Lista, Nuevo, Descargar
    - Crear `components/forms/PreventivoForm.tsx` con validación Zod client-side
    - Integrar botón de descarga PDF en vista de lista y detalle
    - _Requirements: 7.1, 7.2, 7.3, 15.3, 15.4_

- [x] 11. Módulo Cotizaciones
  - [x] 11.1 Implementar API de Cotizaciones con validación de cliente activo
    - Crear `app/api/cotizaciones/route.ts` (GET con paginación/filtros, POST crear)
    - Crear `app/api/cotizaciones/[id]/route.ts` (GET detalle, PATCH aprobar/rechazar)
    - Validar en creación/actualización que `idCliente` referencia un cliente con `activo = true`
    - Implementar aprobación: persistir idAprobador y timestamp; rechazo: persistir motivo
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 15.1, 15.2_

  - [x] 11.2 Escribir property test P9 para integridad referencial de cotizaciones
    - **Property 9: Integridad referencial cotizaciones** — para toda cotización, `idCliente` referencia un cliente existente y activo
    - **Validates: Requirements 5.1**
    - Agregar a `tests/properties/integrity.property.test.ts`
    - _Requirements: 5.1_

  - [x] 11.3 Implementar generación PDF y envío por email de cotizaciones
    - Crear `app/api/cotizaciones/[id]/pdf/route.ts`: PDF con id, info cliente, líneas de ítem, totales, logo, header/footer
    - Crear `app/api/cotizaciones/[id]/email/route.ts`: enviar PDF como adjunto al correo del cliente; retornar error si cliente no tiene correo
    - Implementar `lib/email.ts` con Nodemailer + React Email template
    - _Requirements: 5.5, 5.6, 14.3, 14.4, 14.5_

  - [x] 11.4 Implementar páginas UI de Cotizaciones
    - Crear `app/(dashboard)/cotizaciones/layout.tsx` con tabs: Borrador, Aprobadas, Rechazadas, Todas
    - Crear `components/forms/CotizacionForm.tsx` con líneas de ítem dinámicas y validación Zod
    - Integrar botones de imprimir PDF y enviar por email en vista de detalle
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 15.3, 15.4_


- [x] 12. Módulos Equipos, Clientes y Sedes
  - [x] 12.1 Implementar API de Equipos con validación de referencias y solicitud de baja
    - Crear `app/api/equipos/route.ts` (GET con paginación/filtros, POST crear)
    - Crear `app/api/equipos/[id]/route.ts` (GET detalle, PATCH actualizar)
    - Crear `app/api/equipos/[id]/baja/route.ts` (POST): validar que no exista baja pendiente; crear solicitud tipo baja en estado Pendiente
    - Validar en creación que `idSede` y `idModelo` existen y están activos
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 15.1, 15.2_

  - [x] 12.2 Implementar API de Clientes y Sedes con validaciones de referencias
    - Crear `app/api/clientes/route.ts` (GET con paginación, POST crear con `activo = true` por defecto)
    - Crear `app/api/clientes/[id]/route.ts` (GET detalle, PATCH actualizar)
    - Crear `app/api/sedes/route.ts` (GET con paginación, POST crear)
    - Crear `app/api/sedes/[id]/route.ts` (GET detalle, PATCH actualizar)
    - Validar en creación de sede que `idCliente` y `idMunicipio` existen
    - _Requirements: 8.5, 8.6, 8.7, 8.8, 15.1, 15.2_

  - [x] 12.3 Implementar páginas UI de Equipos, Clientes y Sedes
    - Crear `app/(dashboard)/equipos/layout.tsx` con tabs: Lista, Nuevo, Solicitar Baja
    - Crear `app/(dashboard)/clientes/layout.tsx` con tabs: Lista, Nuevo
    - Crear `app/(dashboard)/sedes/layout.tsx` con tabs: Lista, Nuevo
    - Crear formularios `EquipoForm.tsx`, `ClienteForm.tsx`, `SedeForm.tsx` con validación Zod
    - Implementar flujo de solicitud de baja con confirmación y manejo de error si ya existe baja pendiente
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 15.3, 15.4_

  - [x] 12.4 Escribir unit tests para validaciones de Equipos, Clientes y Sedes
    - Testear rechazo de equipo con sede o modelo inactivo
    - Testear rechazo de segunda solicitud de baja
    - Testear creación de cliente con `activo = true` por defecto
    - Testear rechazo de sede con cliente o municipio inexistente
    - _Requirements: 8.2, 8.3, 8.4, 8.6, 8.8_

- [x] 13. Checkpoint — Verificar módulos de soporte
  - Asegurar que todos los tests pasen, preguntar al usuario si hay dudas.

- [x] 14. Módulo Informes y exportaciones
  - [x] 14.1 Implementar API de Informes: Correctivos, Repuestos e Indicadores
    - Crear `app/api/informes/correctivos/route.ts`: órdenes correctivas en rango de fechas inclusivo, con cálculo de disponibilidad por equipo
    - Crear `app/api/informes/repuestos/route.ts`: repuestos instalados en rango de fechas, agrupados por equipo
    - Crear `app/api/informes/indicadores/route.ts`: total órdenes, promedio días de cierre, costo total de mantenimiento, porcentaje de disponibilidad
    - Aplicar `Data_Scope_Filter` en todos los endpoints de informes
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 14.2 Implementar exportación Excel de informes (máx 10,000 filas)
    - Reutilizar `lib/export/excel.ts` en los tres endpoints de informes
    - Aplicar filtros actuales del servidor al generar el archivo
    - _Requirements: 9.6, 12.3_

  - [x] 14.3 Implementar generación PDF de órdenes con logo y estilo consistente
    - Crear `app/api/ordenes/[id]/pdf/route.ts`: PDF con id, estado, fecha creación, visitas, repuestos instalados, observaciones de cierre, logo, header/footer
    - Reutilizar plantilla de header/footer en todos los PDFs (órdenes, preventivos, cotizaciones)
    - Retornar error si la generación falla; nunca entregar archivo parcial o vacío
    - _Requirements: 14.1, 14.4, 14.5_

  - [x] 14.4 Implementar páginas UI de Informes con selector de rango de fechas
    - Crear `app/(dashboard)/informes/layout.tsx` con tabs: Correctivos, Repuestos instalados, Indicadores
    - Integrar `components/shared/DateRangePicker.tsx` que aplica filtros inclusivos a la query
    - Mostrar resultados en DataTable genérico con botones de exportar Excel y PDF
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 13.5_

  - [x] 14.5 Escribir unit tests para cálculos de informes
    - Testear cálculo de disponibilidad de equipo con y sin órdenes abiertas
    - Testear filtro de rango de fechas inclusivo
    - Testear cálculo de promedio de días de cierre
    - _Requirements: 9.2, 9.3, 9.5_


- [x] 15. Módulo Administración
  - [x] 15.1 Implementar API de gestión de usuarios y roles
    - Crear `app/api/usuarios/route.ts` (GET con paginación, POST crear usuario con hash bcrypt)
    - Crear `app/api/usuarios/[id]/route.ts` (GET detalle, PATCH actualizar, DELETE desactivar)
    - Crear endpoints por rol: `/api/usuarios/administradores`, `/analistas`, `/tecnicos`, `/coordinadores`, `/comerciales`
    - Implementar asignación de permisos especiales: `app/api/usuarios/[id]/permisos/route.ts`
    - _Requirements: 10.1, 10.2, 10.5_

  - [x] 15.2 Implementar gestión de sesiones activas
    - Crear `app/api/sesiones/route.ts` (GET: listar sesiones activas con nombre, usuario, timestamp)
    - Crear `app/api/sesiones/[id]/route.ts` (DELETE: revocar sesión y refresh token asociado; retornar error si falla)
    - _Requirements: 10.3, 10.4_

  - [x] 15.3 Escribir property test P10 para validez temporal de refresh tokens
    - **Property 10: Validez temporal de refresh tokens** — para todo refresh token en BD, `expiresAt > createdAt`
    - **Validates: Requirements 1.2**
    - Agregar a `tests/properties/integrity.property.test.ts`
    - _Requirements: 1.2_

  - [x] 15.4 Implementar páginas UI de Administración
    - Crear `app/(dashboard)/administracion/layout.tsx` con tabs: Usuarios, Administradores, Analistas, Técnicos, Coordinadores, Comerciales, Permisos especiales, Sesiones
    - Crear `components/forms/UsuarioForm.tsx` con selección de rol y validación Zod
    - Implementar vista de Sesiones con botón de revocar por sesión
    - Implementar vista de Permisos especiales con toggle por módulo/ruta
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 16. Módulo Catálogos
  - [x] 16.1 Implementar API de catálogos con actualización en tiempo real
    - Crear `app/api/catalogos/[catalogo]/route.ts` (GET lista, POST crear, PATCH actualizar nombre)
    - Soportar catálogos: marcas, modelos, clases, áreas, tipos, estados, fallas, repuestos, protocolos, actividades, campos, servicios, resultados
    - Invalidar caché de TanStack Query al crear/actualizar para reflejar cambios sin recarga de página
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 16.2 Implementar páginas UI de Catálogos
    - Crear `app/(dashboard)/catalogos/layout.tsx` con tabs para cada catálogo
    - Crear `components/data-table/CatalogoTable.tsx` reutilizable con acciones inline de editar nombre
    - Implementar formulario de creación de entrada de catálogo con validación Zod
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 17. Características especiales: QR, geolocalización y notificaciones
  - [x] 17.1 Implementar captura de geolocalización en login y escáner QR
    - En `app/(auth)/login/page.tsx`: capturar coordenadas del navegador y enviarlas junto con las credenciales; continuar sin coordenadas si el permiso es denegado
    - Actualizar `app/api/auth/[...nextauth]/route.ts` para persistir lat/lng en el registro de sesión
    - Crear `components/shared/QRScanner.tsx` usando `html5-qrcode`; al decodificar, buscar equipo por valor y navegar a su detalle; mostrar error si no se encuentra
    - _Requirements: 13.1, 13.2_

  - [x] 17.2 Implementar notificaciones por email en transiciones de estado
    - Crear `lib/notifications.ts`: disparar email en transiciones clave (aprobación/rechazo de solicitud, cierre de orden, aprobación de cotización)
    - Usar React Email templates para HTML formateado
    - Loguear fallo y continuar sin bloquear la transición si el destinatario no tiene correo
    - _Requirements: 13.4_

  - [x] 17.3 Escribir unit tests para notificaciones y QR
    - Testear que la transición de estado no se bloquea si el email falla
    - Testear que el escáner QR navega al equipo correcto o muestra error
    - _Requirements: 13.2, 13.4_

- [x] 18. Checkpoint — Verificar módulos completos y características especiales
  - Asegurar que todos los tests pasen, preguntar al usuario si hay dudas.


- [x] 19. Validación Zod compartida cliente/servidor
  - [x] 19.1 Centralizar todos los schemas Zod en lib/validations
    - Crear `lib/validations/auth.ts`: `loginSchema`, `cambiarClaveSchema`
    - Crear `lib/validations/solicitudes.ts`, `ordenes.ts`, `visitas.ts`, `preventivos.ts`, `cotizaciones.ts`
    - Crear `lib/validations/equipos.ts`, `clientes.ts`, `sedes.ts`, `usuarios.ts`, `catalogos.ts`
    - Crear `lib/validations/informes.ts` con `dateRangeSchema` (fechas inclusivas)
    - Asegurar que cada API route y formulario de cliente importe del mismo schema
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 19.2 Escribir unit tests para schemas Zod críticos
    - Testear `loginSchema` con credenciales válidas e inválidas
    - Testear `crearSolicitudSchema`, `crearOrdenSchema`, `crearCotizacionSchema`
    - Testear `dateRangeSchema` con rangos válidos e inválidos
    - _Requirements: 15.1, 15.2_

- [x] 20. QA final y migración de datos
  - [x] 20.1 Escribir script de migración de contraseñas a bcrypt
    - Crear `scripts/migrate-passwords.ts`: leer usuarios existentes, hashear claves con bcrypt, actualizar en BD
    - Ejecutar en modo dry-run primero para validar sin modificar datos
    - _Requirements: 10.2_

  - [x] 20.2 Completar suite de property-based tests (P1-P10)
    - Revisar y completar `tests/properties/auth.property.test.ts` (P1-P4)
    - Revisar y completar `tests/properties/data.property.test.ts` (P5-P7)
    - Revisar y completar `tests/properties/integrity.property.test.ts` (P8-P10)
    - Asegurar que todos los 10 properties pasen con fast-check
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 3.1, 4.1, 4.2, 5.1_

  - [x] 20.3 Escribir tests E2E con Playwright para flujos críticos
    - Crear `tests/e2e/auth.spec.ts`: login exitoso, login fallido, logout, redirección de sesión activa
    - Crear `tests/e2e/ordenes.spec.ts`: crear solicitud → aprobar → crear orden → cerrar orden
    - Crear `tests/e2e/dashboard.spec.ts`: carga de KPIs, mapa, charts; manejo de error por sección
    - _Requirements: 1.1, 3.2, 4.2, 4.7_

  - [x] 20.4 Integración final: conectar todos los módulos con navegación y permisos
    - Verificar que el sidebar muestre/oculte módulos según el rol del usuario autenticado
    - Verificar que `Data_Scope_Filter` se aplique consistentemente en todos los módulos
    - Verificar que todas las rutas protegidas redirijan correctamente según rol
    - Verificar que los permisos especiales asignados en Administración se apliquen en requests subsiguientes
    - _Requirements: 2.2, 2.3, 2.4, 2.6, 10.5_

- [x] 21. Checkpoint final — Asegurar que todos los tests pasen
  - Asegurar que todos los tests pasen, preguntar al usuario si hay dudas.


## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requisitos específicos para trazabilidad completa

---

## Plan de Deployment

### Stack de producción recomendado

| Servicio | Opción recomendada | Alternativa |
|---|---|---|
| Next.js app | **Railway** (soporta MySQL nativo) | Render, VPS Ubuntu |
| MySQL | **PlanetScale** (serverless MySQL) o Railway MySQL addon | MySQL en VPS |
| Redis | **Upstash Redis** (serverless, gratis hasta 10K req/día) | Railway Redis addon |
| Email | **Resend** (100 emails/día gratis) | SMTP propio, SendGrid |
| Archivos/PDFs | **Cloudflare R2** (S3-compatible) | Local si VPS |

> Para un MVP rápido con todo en un solo lugar: usar **Railway** para la app, la base de datos MySQL y Redis. Costo estimado: ~$5-10 USD/mes.

---

### Paso 1 — Preparar variables de entorno

Crear el archivo `.env.production` (nunca commitearlo):

```bash
# Base de datos MySQL
DATABASE_URL="mysql://user:password@host:3306/ziriuz"

# NextAuth.js v5
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_URL="https://tu-dominio.com"

# JWT RS256 — generar par de claves:
# openssl genrsa -out private.pem 2048
# openssl rsa -in private.pem -pubout -out public.pem
AUTH_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
AUTH_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Redis
REDIS_URL="redis://default:password@host:6379"

# Email
SMTP_HOST="smtp.resend.com"
SMTP_PORT="465"
SMTP_USER="resend"
SMTP_PASS="re_xxxxxxxxxxxx"
SMTP_FROM="Ziriuz <noreply@tu-dominio.com>"

# App
NEXT_PUBLIC_APP_URL="https://tu-dominio.com"
APP_NAME="Ziriuz"
```

---

### Paso 2 — Preparar la base de datos

```bash
# 1. Apuntar al servidor de producción
export DATABASE_URL="mysql://user:password@host:3306/ziriuz"

# 2. Ejecutar migraciones ADITIVAS (nunca drop)
npx prisma migrate deploy

# 3. Verificar que el esquema aplicó bien
npx prisma db pull --print | head -30

# 4. Migrar contraseñas a bcrypt (dry-run primero)
npx ts-node scripts/migrate-passwords.ts --dry-run
# Si el dry-run muestra resultados correctos:
npx ts-node scripts/migrate-passwords.ts
```

---

### Paso 3 — Build y verificación local

```bash
# Instalar dependencias de producción
npm ci

# Verificar que los tests pasan antes de deployar
npm run test          # vitest unit + property (146 tests)

# Build de producción
npm run build

# Probar el build localmente antes de subir
npm run start
# Abrir http://localhost:3000 y verificar login
```

---

### Paso 4 — Deploy en Railway (opción recomendada)

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login y vincular proyecto
railway login
railway init          # crear nuevo proyecto en Railway
railway link          # vincular a proyecto existente

# 3. Crear servicios en Railway dashboard:
#    - MySQL addon  → copiar DATABASE_URL
#    - Redis addon  → copiar REDIS_URL
#    - Web service  → conectar con este repositorio

# 4. Subir variables de entorno
railway variables set DATABASE_URL="..."  AUTH_SECRET="..."  # (todas las del .env.production)

# 5. Deploy
railway up

# 6. Ver logs en tiempo real
railway logs --tail
```

---

### Paso 5 — Deploy en Vercel (solo app, DB externa)

> Usar si la BD MySQL ya está en un servidor externo (ej. el MySQL existente del monolito PHP).

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Deploy
vercel --prod

# 3. Configurar variables en Vercel dashboard:
#    Project → Settings → Environment Variables
#    Agregar todas las variables del .env.production

# NOTA: Vercel no tiene Redis nativo.
# Usar Upstash Redis: https://upstash.com → crear DB → copiar REDIS_URL
```

---

### Paso 6 — Verificación post-deploy

```bash
# Chequeo de health
curl https://tu-dominio.com/api/health

# Verificar autenticación
# 1. Abrir https://tu-dominio.com/login
# 2. Ingresar con un usuario existente del sistema PHP
# 3. Verificar que el dashboard carga con los datos

# Verificar módulos críticos
# - /solicitudes → lista de solicitudes
# - /ordenes → lista de órdenes
# - /dashboard → KPIs + mapa de Colombia
```

---

### Paso 7 — CI/CD con GitHub Actions (opcional)

Crear `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run test
      - run: npm run build
      - name: Deploy to Railway
        run: railway up --detach
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

### Checklist final antes de ir a producción

- [ ] `npm run test` pasa 146/146 ✓
- [ ] `npm run build` sin errores de TypeScript ✓
- [ ] Variables de entorno configuradas en el servidor ✓
- [ ] `npx prisma migrate deploy` ejecutado en BD de producción ✓
- [ ] Script `migrate-passwords.ts` ejecutado (si usuarios del PHP no tienen bcrypt) ✓
- [ ] Al menos 1 usuario administrador puede hacer login ✓
- [ ] Dashboard carga con datos reales ✓
- [ ] Email de prueba enviado correctamente ✓
- [ ] HTTPS activo (certificado SSL) ✓
- Los checkpoints aseguran validación incremental entre fases
- Los property tests (P1-P10) validan propiedades de corrección universales con fast-check
- Los unit tests validan ejemplos específicos y casos borde
- El DataTable genérico (tarea 5) debe completarse antes de implementar cualquier módulo con lista
- La infraestructura base (tarea 1) es prerequisito de todo lo demás
- Las migraciones de Prisma son aditivas únicamente — no modificar tablas existentes
- El script de migración de contraseñas (20.1) debe ejecutarse en dry-run antes del cutover

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4"] },
    { "id": 3, "tasks": ["1.5", "1.7"] },
    { "id": 4, "tasks": ["1.6", "1.8", "5.1"] },
    { "id": 5, "tasks": ["3.1", "5.2", "5.3"] },
    { "id": 6, "tasks": ["3.2", "3.3", "3.4", "19.1"] },
    { "id": 7, "tasks": ["3.5", "3.6", "6.1", "7.1", "8.1", "10.1", "11.1", "12.1", "12.2", "14.1", "15.1", "15.2", "16.1"] },
    { "id": 8, "tasks": ["6.2", "6.3", "7.2", "8.2", "10.2", "11.2", "12.3", "14.2", "14.3", "15.3", "16.2", "17.1"] },
    { "id": 9, "tasks": ["6.4", "7.3", "7.4", "8.3", "10.3", "11.3", "11.4", "12.4", "14.4", "14.5", "15.4", "17.2"] },
    { "id": 10, "tasks": ["17.3", "19.2"] },
    { "id": 11, "tasks": ["20.1", "20.2"] },
    { "id": 12, "tasks": ["20.3", "20.4"] }
  ]
}
```
