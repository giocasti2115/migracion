# QA Checklist — Ziriuz v2

**Versión:** 2.0.0  
**Entorno:** Local (`http://localhost:3000`)  
**Usuarios de prueba:** ver `scripts/setup-local.sh` (contraseña: `Ziriuz2024!`)

---

## Cómo ejecutar las pruebas

1. Levantar entorno: `bash scripts/setup-local.sh`
2. Iniciar la app: `npm run dev`
3. Abrir `http://localhost:3000`
4. Ir completando cada caso abajo, marcando `[x]` cuando pasa o `[!]` si falla

**Convención:**
- `[ ]` — no probado
- `[x]` — PASS
- `[!]` — FAIL (anotar descripción del fallo debajo)

---

## 1. Autenticación

| # | Caso | Usuario | Resultado esperado |
|---|------|---------|-------------------|
| A-01 | Login con credenciales correctas | `admin.qa` | Redirige a `/` (dashboard) |
| A-02 | Login con contraseña incorrecta | `admin.qa` / `mala_clave` | Mensaje de error visible, sin redirigir |
| A-03 | Login con usuario inexistente | `usuario_falso` | Mensaje de error, sin redirigir |
| A-04 | Campos vacíos en login | — | Validación inline visible antes de enviar |
| A-05 | Cerrar sesión | cualquiera | Redirige a `/login`, cookie eliminada |
| A-06 | Acceder a `/` sin sesión activa | — | Redirige a `/login` |
| A-07 | Técnico intenta acceder a `/administracion` | `tecnico.qa` | Redirige a `/no-autorizado` |
| A-08 | Admin accede a `/administracion` | `admin.qa` | Carga correctamente |
| A-09 | Cambiar contraseña con nueva válida | cualquiera | Mensaje de éxito |
| A-10 | Cambiar contraseña — nueva < 8 caracteres | cualquiera | Error de validación visible |

**Fallos encontrados:**
```
[!] A-XX: ...descripción...
```

---

## 2. Dashboard

| # | Caso | Usuario | Resultado esperado |
|---|------|---------|-------------------|
| D-01 | Dashboard carga sin errores 500 | `admin.qa` | Página carga sin error |
| D-02 | 4 KPI cards visibles | `admin.qa` | Órdenes Abiertas, Solicitudes Pendientes, Visitas Hoy, Cotizaciones |
| D-03 | Mapa de Colombia renderiza | `admin.qa` | SVG visible con departamentos |
| D-04 | Hover sobre departamento muestra tooltip | `admin.qa` | Tooltip con nombre y datos |
| D-05 | Charts cargan (barras/torta) | `admin.qa` | Al menos un chart visible |
| D-06 | Una sección falla — resto no se bloquea | — | Otras secciones siguen mostrando datos |
| D-07 | Dashboard responsivo en móvil | cualquiera | Layout vertical, sin desbordamiento |

**Fallos encontrados:**
```

```

---

## 3. Solicitudes

| # | Caso | Usuario | Resultado esperado |
|---|------|---------|-------------------|
| S-01 | Lista de solicitudes carga | `admin.qa` | Tabla con datos o mensaje "sin resultados" |
| S-02 | Crear solicitud con campos válidos | `analista.qa` | Solicitud creada en estado Pendiente |
| S-03 | Crear solicitud sin equipo — error | `analista.qa` | Error de validación visible |
| S-04 | Aprobar solicitud Pendiente | `admin.qa` | Estado → Aprobada, Orden generada automáticamente |
| S-05 | Rechazar solicitud con motivo | `admin.qa` | Estado → Rechazada, motivo guardado |
| S-06 | Tabs (Pendientes / Aprobadas / Rechazadas / Todas) | `admin.qa` | Filtran correctamente |
| S-07 | Exportar lista a Excel | `admin.qa` | Archivo `.xlsx` descargado |
| S-08 | Técnico ve solicitudes (solo sus sedes) | `tecnico.qa` | No ve solicitudes de otras sedes |

**Fallos encontrados:**
```

```

---

## 4. Órdenes

| # | Caso | Usuario | Resultado esperado |
|---|------|---------|-------------------|
| O-01 | Lista de órdenes carga | `admin.qa` | Tabla con datos |
| O-02 | Ver detalle de una orden | `admin.qa` | Información completa visible |
| O-03 | Cerrar orden con observaciones | `admin.qa` | Estado → Cerrada, `diasFuera` calculado |
| O-04 | Reabrir orden cerrada | `admin.qa` | Estado → Abierta nuevamente |
| O-05 | Anular orden | `admin.qa` | Estado → Anulada, sin posibilidad de más cambios |
| O-06 | Descargar PDF de orden | `admin.qa` | PDF descargado con logo y datos |
| O-07 | Firma digital capturada | `tecnico.qa` | Firma guardada, visible en detalle |
| O-08 | Descargar ZIP de adjuntos | `admin.qa` | ZIP descargado con archivos |
| O-09 | `diasFuera` nunca es negativo | — | Verificar en lista que columna ≥ 0 |
| O-10 | Tabs (Abiertas / Cerradas / Todas) | `admin.qa` | Filtran correctamente |

**Fallos encontrados:**
```

```

---

## 5. Visitas

| # | Caso | Usuario | Resultado esperado |
|---|------|---------|-------------------|
| V-01 | Lista de visitas carga | `admin.qa` | Tabla visible |
| V-02 | Crear visita vinculada a una orden | `tecnico.qa` | Visita en estado Pendiente |
| V-03 | Aprobar visita Pendiente | `admin.qa` | Estado → Aprobada |
| V-04 | Ejecutar visita Aprobada | `tecnico.qa` | Estado → Abierta |
| V-05 | Cerrar visita con observaciones ≤ 1000 chars | `tecnico.qa` | Estado → Cerrada |
| V-06 | Observaciones > 1000 caracteres — error | `tecnico.qa` | Validación visible |
| V-07 | Rechazar visita con motivo ≤ 500 chars | `admin.qa` | Estado → Rechazada |
| V-08 | Motivo rechazo > 500 chars — error | `admin.qa` | Validación visible |
| V-09 | Transición inválida (ej: Pendiente → Cerrada) | — | Error descriptivo |
| V-10 | Vista calendario muestra visitas por fecha | `admin.qa` | Calendario con eventos |

**Fallos encontrados:**
```

```

---

## 6. Cotizaciones

| # | Caso | Usuario | Resultado esperado |
|---|------|---------|-------------------|
| C-01 | Crear cotización con cliente activo | `comercial.qa` | Cotización en Borrador |
| C-02 | Crear cotización con cliente inactivo — error | `comercial.qa` | Error de validación |
| C-03 | Agregar ítem de repuesto con cantidad y valor | `comercial.qa` | Ítem visible en lista |
| C-04 | Guardar cotización sin ítems — error | `comercial.qa` | Validación visible |
| C-05 | Aprobar cotización | `admin.qa` | Estado → Aprobada |
| C-06 | Rechazar cotización con motivo | `admin.qa` | Estado → Rechazada |
| C-07 | Generar PDF de cotización | `admin.qa` | PDF con logo, ítems y totales |
| C-08 | Enviar cotización por email | `admin.qa` | Email visible en Mailpit (`http://localhost:8025`) |
| C-09 | Enviar email sin correo de cliente — error | `admin.qa` | Error descriptivo |

**Fallos encontrados:**
```

```

---

## 7. Preventivos

| # | Caso | Usuario | Resultado esperado |
|---|------|---------|-------------------|
| P-01 | Crear preventivo con equipo y fecha | `admin.qa` | Preventivo creado |
| P-02 | Crear preventivo sin equipo — error | `admin.qa` | Validación visible |
| P-03 | Crear preventivo sin actividades — error | `admin.qa` | Validación visible |
| P-04 | Generar PDF de preventivo | `admin.qa` | PDF con logo, actividades y protocolos |

**Fallos encontrados:**
```

```

---

## 8. Informes

| # | Caso | Usuario | Resultado esperado |
|---|------|---------|-------------------|
| I-01 | Informe Correctivos con rango de fechas válido | `admin.qa` | Tabla con resultados |
| I-02 | Rango de fechas donde `inicio > fin` — error | `admin.qa` | Validación visible |
| I-03 | Disponibilidad de equipo calculada | `admin.qa` | Columna entre 0% y 100% |
| I-04 | Exportar informe a Excel | `admin.qa` | Archivo `.xlsx` descargado |
| I-05 | Informe Repuestos instalados | `admin.qa` | Tabla agrupada por equipo |
| I-06 | Informe Indicadores | `admin.qa` | KPIs: total órdenes, promedio días, disponibilidad |

**Fallos encontrados:**
```

```

---

## 9. Módulos de catálogo

| # | Caso | Usuario | Resultado esperado |
|---|------|---------|-------------------|
| K-01 | Crear nueva Marca | `admin.qa` | Marca aparece en lista sin recargar |
| K-02 | Crear nuevo Modelo | `admin.qa` | Modelo disponible en formularios de equipo |
| K-03 | Editar nombre de catálogo inline | `admin.qa` | Cambio guardado |
| K-04 | Técnico intenta acceder a catálogos | `tecnico.qa` | Redirige a `/no-autorizado` |

**Fallos encontrados:**
```

```

---

## 10. Administración

| # | Caso | Usuario | Resultado esperado |
|---|------|---------|-------------------|
| ADM-01 | Crear nuevo usuario Técnico | `admin.qa` | Usuario creado con rol correcto |
| ADM-02 | Crear usuario sin contraseña — error | `admin.qa` | Validación visible |
| ADM-03 | Ver sesiones activas | `admin.qa` | Lista de sesiones con timestamps |
| ADM-04 | Revocar sesión de otro usuario | `admin.qa` | Sesión revocada, usuario deslogueado |
| ADM-05 | Técnico intenta acceder a administración | `tecnico.qa` | Redirige a `/no-autorizado` |
| ADM-06 | Asignar permiso especial a usuario | `admin.qa` | Permiso guardado y aplicado |

**Fallos encontrados:**
```

```

---

## 11. QR y Geolocalización

| # | Caso | Usuario | Resultado esperado |
|---|------|---------|-------------------|
| QR-01 | Escáner QR abre cámara | `tecnico.qa` | Solicitud de permiso de cámara |
| QR-02 | Escanear código QR válido de equipo | `tecnico.qa` | Navega al detalle del equipo |
| QR-03 | Escanear QR inválido | `tecnico.qa` | Mensaje de error, sin crash |
| GEO-01 | Login captura geolocalización (si se permite) | `tecnico.qa` | Sesión registrada con lat/lng |
| GEO-02 | Login sin permiso de geolocalización | `tecnico.qa` | Login continúa normalmente sin coordenadas |

**Fallos encontrados:**
```

```

---

## 12. Transversales / No funcionales

| # | Caso | Resultado esperado |
|---|------|--------------------|
| T-01 | Todos los formularios con campos inválidos muestran error inline | Sin alertas nativas del browser |
| T-02 | Errores de red en cualquier módulo no bloquean la UI | Mensaje de error inline, resto funciona |
| T-03 | Emails de notificación llegan a Mailpit al aprobar/rechazar | Visible en `http://localhost:8025` |
| T-04 | Exportación Excel con 0 resultados — archivo válido vacío | Sin error 500 |
| T-05 | Sidebar oculta módulos según el rol | Técnico no ve Catálogos ni Administración |
| T-06 | Paginación funciona en todas las listas | Cambiar página, resultados correctos |
| T-07 | Sorting por columna funciona | Clic en encabezado, orden cambia |
| T-08 | Filtro de búsqueda funciona en tablas | Resultados filtrados en tiempo real o al enviar |
| T-09 | Session timeout (esperar más de 15 min) | Redirige a login automáticamente |
| T-10 | App accesible en móvil (375px) | Sin scroll horizontal, botones usables |

**Fallos encontrados:**
```

```

---

## Resumen del QA

| Módulo | Total | Pass | Fail | Bloqueante |
|--------|-------|------|------|------------|
| Autenticación | 10 | | | |
| Dashboard | 7 | | | |
| Solicitudes | 8 | | | |
| Órdenes | 10 | | | |
| Visitas | 10 | | | |
| Cotizaciones | 9 | | | |
| Preventivos | 4 | | | |
| Informes | 6 | | | |
| Catálogos | 4 | | | |
| Administración | 6 | | | |
| QR / Geo | 5 | | | |
| Transversales | 10 | | | |
| **TOTAL** | **89** | | | |

---

## Criterio de salida a producción

- [ ] ≥ 90% de casos PASS
- [ ] 0 fallos **bloqueantes** (no se puede iniciar sesión, crash de app, pérdida de datos)
- [ ] Fallos no bloqueantes documentados con ticket/issue
- [ ] Todos los flujos del módulo Solicitudes → Órdenes → Visitas probados end-to-end
- [ ] Al menos 1 PDF generado correctamente (orden, preventivo, cotización)
- [ ] Al menos 1 email capturado en Mailpit
- [ ] **QA firma aprobación:** _________________________ Fecha: _____________
