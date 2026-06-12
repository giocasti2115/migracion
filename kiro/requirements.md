# Requirements Document

## Introduction

This document defines the functional and non-functional requirements for the migration of the ZIRIUZ platform from a PHP monolith to a modern stack based on Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Prisma, MySQL, and Redis. The migration preserves all existing modules and sub-modules, introduces robust JWT-based authentication with single-session enforcement, a role-based access control system, an interactive dashboard with a Colombia department map, and comprehensive data management capabilities across all operational modules.

---

## Glossary

- **System**: The ZIRIUZ Next.js platform being built.
- **Auth_Service**: The authentication and session management subsystem (NextAuth.js v5).
- **Middleware**: The Next.js middleware responsible for route protection and role enforcement.
- **Session_Manager**: The component responsible for creating, revoking, and tracking user sessions.
- **Token_Service**: The component responsible for issuing, rotating, and revoking JWT access tokens and refresh tokens.
- **Data_Scope_Filter**: The component that restricts data queries to sedes/clientes related to the requesting user.
- **Dashboard**: The home page of the platform displaying KPI cards, the Colombia map, and charts.
- **Map_Component**: The interactive SVG map of Colombia divided by 32 departments and Bogotá D.C.
- **DataTable**: The generic server-side paginated, sortable, and filterable table component.
- **PDF_Generator**: The component responsible for generating PDF documents from orders, preventivos, and cotizaciones.
- **Email_Service**: The component responsible for sending email notifications via Nodemailer.
- **Orden**: A work order created from an approved solicitud.
- **Solicitud**: A service request submitted for a piece of equipment.
- **Visita**: A field visit associated with an orden.
- **Preventivo**: A preventive maintenance plan.
- **Cotizacion**: A commercial quotation associated with an orden.
- **Equipo**: A piece of equipment registered under a sede.
- **Cliente**: A client organization that owns one or more sedes.
- **Sede**: A physical location belonging to a cliente.
- **Departamento**: One of the 32 Colombian departments or Bogotá D.C., used for geographic grouping.
- **Rol**: A user role — one of: Administrador, Analista, Técnico, Coordinador, Comercial.
- **Admin**: A user with the Administrador role.
- **RefreshToken**: A long-lived token stored in the database used to obtain new access tokens.
- **AccessToken**: A short-lived JWT (15 minutes, RS256) used to authenticate API requests.

---

## Requirements

### Requirement 1: Authentication and Session Management

**User Story:** As a user, I want to log in securely and maintain a single active session, so that my account is protected and session state is consistent across devices.

#### Acceptance Criteria

1. WHEN a user successfully authenticates with valid credentials, THE Session_Manager SHALL revoke all previous active sessions for that user before creating a new one, so that at any point in time exactly one session is active for that user.

2. WHEN a user submits credentials that do not match any active account, THE Auth_Service SHALL return a generic authentication failure message that does not reveal whether the username or password was incorrect.

3. WHEN a refresh token has been revoked or has expired, THE Token_Service SHALL return HTTP 401 for any request to `/api/auth/refresh` using that token.

4. WHEN a request arrives with an expired access token and the refresh token is absent, expired, or revoked, THE Middleware SHALL redirect the request to `/login` without exposing any protected resource content.

5. WHEN a user with role Técnico attempts to access any route under `/administracion`, THE Middleware SHALL deny access and redirect to `/no-autorizado`, regardless of query parameters or request headers.

6. WHEN a user successfully logs in, THE Auth_Service SHALL issue a short-lived access token and a long-lived refresh token, delivering both via httpOnly cookies so that client-side JavaScript cannot read them.

7. WHEN a valid refresh token is presented to `/api/auth/refresh`, THE Token_Service SHALL revoke the previous refresh token, issue a new access token and a new refresh token, and set both as httpOnly cookies.

8. WHEN a previously used refresh token is presented to `/api/auth/refresh`, THE Token_Service SHALL treat it as a token-reuse attack, revoke all active sessions for the associated user, and return HTTP 401.

9. WHEN a user logs out, THE Auth_Service SHALL revoke the active refresh token in the database, mark the session as inactive, and clear all authentication cookies.

10. IF a user is not authenticated, WHEN the user navigates to `/cambiar-clave`, THE System SHALL display the password recovery page without requiring an active session.

11. WHEN an authenticated user navigates to `/login` or `/cambiar-clave`, THE Middleware SHALL redirect the user to the dashboard home page.

---

### Requirement 2: Role-Based Access Control and Data Scoping

**User Story:** As a system administrator, I want role-based access control and data scoping, so that users only see and interact with data relevant to their assigned role and associated locations.

#### Acceptance Criteria

1. WHEN a non-admin user requests a list of órdenes, THE Data_Scope_Filter SHALL return only órdenes whose associated equipo belongs to a sede explicitly assigned to that user's profile, ensuring no orden from an unrelated sede appears in the response.

2. WHEN any user attempts to access a route outside the set of modules permitted for their role, THE Middleware SHALL deny access, hide the corresponding navigation item, and redirect the user to `/no-autorizado`.

3. WHEN a non-admin user requests any list or detail view in any module, THE Data_Scope_Filter SHALL restrict the returned records to those associated with sedes explicitly assigned to that user, with Administrador users receiving all records without restriction.

4. THE System SHALL enforce the following module access by role, both by hiding navigation items and by blocking direct route access with a redirect to `/no-autorizado`:
   - Dashboard: all roles
   - Solicitudes, Órdenes, Visitas: Administrador, Analista, Coordinador, Técnico
   - Preventivos: Administrador, Analista, Coordinador
   - Cotizaciones: Administrador, Comercial, Analista
   - Equipos, Clientes, Sedes: Administrador, Analista
   - Informes: Administrador, Analista, Coordinador
   - Administración, Catálogos: Administrador only

5. WHEN a non-admin user requests dashboard KPI data, THE Data_Scope_Filter SHALL exclude counts from sedes not assigned to that user, so that the displayed totals reflect only the user's scope; Administrador users SHALL receive counts across all sedes.

6. WHEN a non-admin user requests data from any module that supports sede-based scoping (Solicitudes, Órdenes, Visitas, Equipos, Cotizaciones), THE Data_Scope_Filter SHALL apply the same sede restriction as defined in criterion 1 and criterion 3.

---

### Requirement 3: Dashboard and Colombia Map

**User Story:** As a user, I want an interactive dashboard with a Colombia department map and KPI metrics, so that I can quickly understand the operational status of the platform.

#### Acceptance Criteria

1. WHEN the dashboard loads map data, THE Map_Component SHALL ensure that for every departamento returned, `totalOrdenes >= ordenesAbiertas`, since open orders are a strict subset of total orders.

2. WHEN the dashboard loads, THE Dashboard SHALL display four KPI cards — Órdenes Abiertas, Solicitudes Pendientes, Visitas Hoy, and Cotizaciones Activas — each reflecting the count fetched at load time and scoped to the requesting user's sedes as defined in Requirement 2 criterion 5.

3. WHEN a user hovers over a department on the map, THE Map_Component SHALL display a tooltip showing the department name, total orders, and open orders for that department.

4. WHEN a user clicks on a department on the map, THE Map_Component SHALL display a drill-down panel showing at minimum the orden identifier, estado, and creation date for each orden in that department within the 12-month window.

5. WHEN the map renders, THE Map_Component SHALL apply a quantile-based heatmap color scale to each department based on its `totalOrdenes` value, where departments with higher values receive visually darker fills than departments with lower values, and departments with `totalOrdenes = 0` receive a neutral gray fill.

6. WHEN the dashboard loads, THE Dashboard SHALL display the following charts:
   - Órdenes por mes: BarChart comparing abiertas vs cerradas per month
   - Distribución por tipo de servicio: PieChart by service type
   - Top equipos con más correctivos: HorizontalBarChart
   - Disponibilidad por cliente: BarChart showing the percentage of equipos per client with no open correctivo orden during the selected period

7. WHEN map data is fetched, THE System SHALL aggregate orders created from the current date minus 12 months up to the current date, grouped by departamento using the DANE department code as the geographic identifier.

8. WHEN any dashboard data fetch fails, THE Dashboard SHALL render the successfully loaded sections and display an inline error indicator for the failed section, without blocking the rest of the page.

---

### Requirement 4: Solicitudes and Órdenes Modules

**User Story:** As an analyst or coordinator, I want to manage service requests and work orders through their full lifecycle, so that equipment service is tracked from request to completion.

#### Acceptance Criteria

1. WHEN an orden is displayed or exported, THE System SHALL compute `diasFuera` as the number of calendar days between the associated solicitud creation date and the orden closure date, or the current date if the orden is still open, and THE System SHALL ensure `diasFuera >= 0` for every orden.

2. WHEN a solicitud transitions to the approved state, THE System SHALL create exactly one associated orden in a single atomic operation, so that no approved solicitud exists without an associated orden and no solicitud has more than one associated orden.

3. WHEN a user views the Solicitudes module, THE System SHALL display sub-views: Pendientes, Aprobadas, Rechazadas, and Todas, each filtered by the corresponding estado.

4. WHEN an authorized user approves a solicitud that is currently in the Pendiente estado, THE System SHALL transition the solicitud estado to Aprobada and create a new Orden associated with that solicitud.

5. WHEN an authorized user rejects a solicitud that is currently in the Pendiente estado, THE System SHALL transition the solicitud estado to Rechazada and persist the rejection reason provided by the user.

6. WHEN a user views the Órdenes module, THE System SHALL display sub-views: Abiertas, Cerradas, and Todas, each filtered by the corresponding estado.

7. WHEN an authorized user closes an orden that is currently in the Abierta estado, THE System SHALL record the closure timestamp, the identity of the closing user, and any observaciones de cierre provided.

8. WHEN an authorized user reopens an orden that is currently in the Cerrada estado, THE System SHALL clear the closure timestamp and restore the orden to the Abierta estado.

9. WHEN an authorized user cancels an orden, THE System SHALL transition the orden to the Anulada estado and reject any subsequent modification attempts on that orden with an appropriate error message.

10. WHEN an authorized user requests a ZIP export of an orden, THE System SHALL package all documents and images associated with that orden into a single downloadable ZIP file.

11. WHEN an authorized user requests a digital signature for an orden delivery, THE System SHALL display a signature pad component and, upon confirmation, persist the captured signature as an image linked to that orden.

---

### Requirement 5: Cotizaciones Module

**User Story:** As a commercial user or analyst, I want to manage quotations through their full lifecycle, so that commercial proposals are tracked and approved efficiently.

#### Acceptance Criteria

1. WHEN a cotizacion is created or updated, THE System SHALL validate that the referenced cliente exists in the database with `activo = true`, and SHALL reject the operation with a validation error if the cliente does not exist or is inactive.

2. WHEN a user views the Cotizaciones module, THE System SHALL display sub-views: Borrador, Aprobadas, Rechazadas, and Todas, each filtered by the corresponding estado.

3. WHEN an authorized user approves a cotizacion that is currently in the Borrador estado, THE System SHALL transition the cotizacion estado to Aprobada and persist the identity of the approving user and the approval timestamp.

4. WHEN an authorized user rejects a cotizacion that is currently in the Borrador estado, THE System SHALL transition the cotizacion estado to Rechazada and persist the rejection reason provided by the user.

5. WHEN an authorized user requests to print a cotizacion, THE PDF_Generator SHALL produce a non-empty PDF document containing the cotizacion identifier, client information, line items, and totals.

6. WHEN an authorized user requests to send a cotizacion by email, THE Email_Service SHALL send the cotizacion PDF as an attachment to the email address registered for the associated cliente, and SHALL return an error to the user if the cliente has no registered email address.

---

### Requirement 6: Visitas Module

**User Story:** As a technician or coordinator, I want to manage field visits associated with work orders, so that on-site service activities are tracked and scheduled.

#### Acceptance Criteria

1. WHEN a user views the Visitas module, THE System SHALL display sub-views: Pendientes, Abiertas, Cerradas, and Calendario, where Pendientes shows visitas in estado Pendiente, Abiertas shows visitas in estado Abierta, Cerradas shows visitas in estado Cerrada, and Calendario shows all active visitas in a calendar layout.

2. WHEN an authorized user approves a visita that is currently in the Pendiente estado, THE System SHALL transition the visita estado to Aprobada.

3. WHEN an authorized user rejects a visita that is currently in the Pendiente estado, THE System SHALL transition the visita estado to Rechazada and persist the rejection reason, which must not exceed 500 characters.

4. WHEN an authorized user executes a visita that is currently in the Aprobada estado, THE System SHALL transition the visita estado to Abierta and record the execution timestamp.

5. WHEN an authorized user closes a visita that is currently in the Abierta estado, THE System SHALL transition the visita estado to Cerrada and persist the closing timestamp and observations, which must not exceed 1000 characters.

6. WHEN the Calendario sub-view is displayed, THE System SHALL render all active visitas organized by their scheduled date, defaulting to the current month's view.

7. WHEN an authorized user attempts a visita estado transition that is not permitted from the current estado, THE System SHALL reject the action and display an error message indicating the invalid transition.

---

### Requirement 7: Preventivos Module

**User Story:** As an analyst or coordinator, I want to manage preventive maintenance plans, so that scheduled maintenance activities are documented and downloadable.

#### Acceptance Criteria

1. WHEN a user views the Preventivos module, THE System SHALL display sub-views: Lista, Nuevo, and Descargar.

2. WHEN an authorized user creates a new preventivo, THE System SHALL persist the preventivo record only if it includes at minimum: the associated equipo, a scheduled date, and at least one activity or protocol reference.

3. WHEN an authorized user requests to download a preventivo, THE PDF_Generator SHALL produce a non-empty PDF document containing the preventivo title, code, version, scheduled date, and all associated activities and protocols.

4. WHEN the PDF_Generator fails to produce a preventivo document, THE System SHALL display an error message to the user and SHALL NOT deliver a partial or empty file.

---

### Requirement 8: Equipos, Clientes, and Sedes Modules

**User Story:** As an analyst or administrator, I want to manage equipment, clients, and locations, so that the asset registry is accurate and up to date.

#### Acceptance Criteria

1. WHEN a user views the Equipos module, THE System SHALL display sub-views: Lista, Nuevo, and Solicitar Baja.

2. WHEN an authorized user creates a new equipo, THE System SHALL persist the equipo record only if the referenced sede and modelo both exist and are active; otherwise THE System SHALL return a validation error identifying the invalid reference.

3. WHEN an authorized user requests baja for an equipo that does not already have an open baja solicitud, THE System SHALL create a new solicitud of the baja type in the Pendiente estado associated with that equipo.

4. WHEN an authorized user requests baja for an equipo that already has an open baja solicitud, THE System SHALL reject the request and display an error message indicating that a baja solicitud is already pending.

5. WHEN a user views the Clientes module, THE System SHALL display sub-views: Lista and Nuevo.

6. WHEN an authorized user creates a new cliente, THE System SHALL persist the cliente record with `activo = true` as the default value.

7. WHEN a user views the Sedes module, THE System SHALL display sub-views: Lista and Nuevo.

8. WHEN an authorized user creates a new sede, THE System SHALL persist the sede record only if the referenced cliente and municipio both exist; otherwise THE System SHALL return a validation error identifying the invalid reference.

---

### Requirement 9: Informes Module

**User Story:** As an analyst or coordinator, I want to generate operational reports with date range filters, so that I can analyze service performance and equipment availability.

#### Acceptance Criteria

1. WHEN a user views the Informes module, THE System SHALL display sub-views: Correctivos, Repuestos instalados, and Indicadores.

2. WHEN a user generates the Correctivos report with a date range, THE System SHALL return all correctivo órdenes whose creation date falls within the specified inclusive date range.

3. WHEN the Correctivos report is generated, THE System SHALL calculate equipment availability for each equipo as the percentage of days within the date range during which the equipo had no open correctivo orden.

4. WHEN a user generates the Repuestos instalados report, THE System SHALL list all spare parts installed within the specified date range grouped by equipo, including part name, quantity, and installation date.

5. WHEN a user generates the Indicadores report, THE System SHALL compute and display at minimum: total órdenes, average days to close, total maintenance cost, and equipment availability percentage for the selected period.

6. WHEN a user requests an Excel export of any report, THE DataTable SHALL generate and download an Excel file containing all rows matching the current filters, up to a maximum of 10,000 rows per export.

---

### Requirement 10: Administración Module

**User Story:** As an administrator, I want to manage users, roles, permissions, and active sessions, so that I can control platform access and monitor usage.

#### Acceptance Criteria

1. WHEN an administrator views the Administración module, THE System SHALL display sub-views: Usuarios, Administradores, Analistas, Técnicos, Coordinadores, Comerciales, Permisos especiales, and Sesiones.

2. WHEN an administrator creates a new user, THE System SHALL persist the usuario record with the password stored as a secure hash and the assigned role linked to the user.

3. WHEN an administrator views the Sesiones sub-view, THE System SHALL display all currently active sessions, each showing the associated user's name, username, and session creation timestamp.

4. WHEN an administrator revokes a session, THE Session_Manager SHALL mark the session as inactive and revoke the associated refresh token; IF the revocation fails, THE System SHALL display an error message and leave the session in its previous state.

5. WHEN an administrator assigns special permissions to a user, THE System SHALL persist the permission overrides and apply them during route authorization checks for that user on subsequent requests.

---

### Requirement 11: Catálogos Module

**User Story:** As an administrator, I want to manage all reference catalogs, so that the platform's lookup data is accurate and up to date.

#### Acceptance Criteria

1. WHEN an administrator views the Catálogos module, THE System SHALL display sub-views for: Marcas, Modelos, Clases, Áreas, Tipos, Estados, Fallas (modos, causas, acciones), Repuestos, Protocolos, Actividades, Campos, Servicios, and Resultados.

2. WHEN an administrator creates a new catalog entry, THE System SHALL persist the record and make it available in all dependent dropdowns and filters within the same user session without requiring a page reload.

3. WHEN an administrator updates a catalog entry's display name, THE System SHALL reflect the updated name in all UI elements that reference that entry, while preserving the entry's identifier so that existing data records are not broken.

---

### Requirement 12: DataTable and Export Features

**User Story:** As a user, I want powerful data tables with server-side operations and export capabilities, so that I can efficiently browse, filter, and extract data from any module.

#### Acceptance Criteria

1. WHEN a user interacts with any DataTable, THE DataTable SHALL execute pagination, sorting, and column filtering on the server, returning only the requested page of results without loading all records into the client.

2. WHEN a user toggles column visibility, THE DataTable SHALL show or hide the selected columns immediately and persist the preference for the duration of the current browser session.

3. WHEN a user requests an Excel export, THE DataTable SHALL generate and download an Excel file containing all rows matching the current server-side filters, up to a maximum of 10,000 rows.

4. WHEN a user requests a PDF export, THE DataTable SHALL generate and download a PDF file containing all rows matching the current server-side filters, up to a maximum of 10,000 rows.

5. WHEN a DataTable row's computed value exceeds a threshold configured for that column (e.g., days overdue greater than the warning threshold), THE DataTable SHALL apply a distinct background color to that row to indicate the threshold breach.

6. WHEN a DataTable is configured with group-by for a column, THE DataTable SHALL group rows by the distinct values of that column and display a group header row showing the group value and the count of rows in that group.

---

### Requirement 13: Special Features and Integrations

**User Story:** As a user, I want access to special platform features including QR scanning, geolocation, digital signatures, and email notifications, so that field operations are fully supported.

#### Acceptance Criteria

1. WHEN a user logs in and the browser grants location permission, THE Auth_Service SHALL capture and persist the user's latitude and longitude coordinates alongside the session record; IF the browser denies location permission, THE Auth_Service SHALL proceed with login without capturing coordinates.

2. WHEN an authorized user activates the QR scanner and a QR code is successfully decoded, THE System SHALL use the decoded value to look up the associated equipo and navigate to that equipo's detail view; IF the decoded value does not match any equipo, THE System SHALL display an error message indicating no equipo was found.

3. WHEN an authorized user confirms a digital signature on the signature pad, THE System SHALL persist the captured signature as an image file linked to the relevant record.

4. WHEN a state transition triggers an email notification, THE Email_Service SHALL send a formatted HTML email to the email address registered for the primary recipient of that notification type; IF the recipient has no registered email address, THE System SHALL log the failure and continue without blocking the state transition.

5. WHEN a user selects a date range using the date range picker, THE System SHALL apply the selected start and end dates as inclusive filters to the associated data query and refresh the displayed results.

---

### Requirement 14: PDF Generation

**User Story:** As a user, I want to generate PDF documents for orders, preventivos, and cotizaciones, so that I can print and share official service documents.

#### Acceptance Criteria

1. WHEN an authorized user requests a PDF for an orden, THE PDF_Generator SHALL produce a non-empty PDF document containing the orden identifier, estado, creation date, associated visitas, installed repuestos, and observaciones de cierre if present.

2. WHEN an authorized user requests a PDF for a preventivo, THE PDF_Generator SHALL produce a non-empty PDF document containing the preventivo title, code, version, scheduled date, and all associated activities and protocols.

3. WHEN an authorized user requests a PDF for a cotizacion, THE PDF_Generator SHALL produce a non-empty PDF document containing the cotizacion identifier, client information, all line items with quantities and unit prices, and the total amount.

4. WHEN the PDF_Generator produces any document, THE PDF_Generator SHALL include the company logo and apply a consistent header and footer style across all pages.

5. WHEN the PDF_Generator fails to produce a document, THE System SHALL display an error message to the user and SHALL NOT deliver a partial or empty file.

---

### Requirement 15: Input Validation

**User Story:** As a developer, I want all inputs validated with shared Zod schemas on both client and server, so that invalid data never reaches the database.

#### Acceptance Criteria

1. WHEN any API route receives a request, THE System SHALL validate all input parameters against the corresponding Zod schema before executing any database operation.

2. IF a request contains data that fails Zod schema validation, THEN THE System SHALL return HTTP 400 with a JSON response body containing a `errors` array where each element identifies the field path and the validation message for that field.

3. WHEN a form is submitted on the client, THE System SHALL validate the form data against the same Zod schema used on the server before sending the HTTP request.

4. WHEN a Zod schema rejects a form field's value, THE System SHALL display the corresponding validation error message adjacent to that field and SHALL NOT submit the form.
