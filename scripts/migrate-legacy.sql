-- ============================================================
-- MIGRATION: ziriuz_memco (legacy) → ziriuz (Prisma v2)
-- Password for all migrated users: Ziriuz2024!
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- ---- Truncate all tables in reverse dependency order -------
TRUNCATE TABLE ziriuz.cotizaciones_repuestos;
TRUNCATE TABLE ziriuz.cotizaciones_items_adicionales;
TRUNCATE TABLE ziriuz.cotizaciones;
TRUNCATE TABLE ziriuz.cotizaciones_estados;
TRUNCATE TABLE ziriuz.ordenes_adjuntos;
TRUNCATE TABLE ziriuz.ordenes_cambios;
TRUNCATE TABLE ziriuz.ordenes_sub_estados;
TRUNCATE TABLE ziriuz.visitas;
TRUNCATE TABLE ziriuz.visitas_estados;
TRUNCATE TABLE ziriuz.ordenes;
TRUNCATE TABLE ziriuz.ordenes_estados;
TRUNCATE TABLE ziriuz.solicitudes;
TRUNCATE TABLE ziriuz.solicitudes_estados;
TRUNCATE TABLE ziriuz.equipos;
TRUNCATE TABLE ziriuz.permisos_especiales;
TRUNCATE TABLE ziriuz.usuarios_vs_sedes;
TRUNCATE TABLE ziriuz.usuarios_vs_clientes;
TRUNCATE TABLE ziriuz.comerciales;
TRUNCATE TABLE ziriuz.coordinadores;
TRUNCATE TABLE ziriuz.tecnicos;
TRUNCATE TABLE ziriuz.analistas;
TRUNCATE TABLE ziriuz.administradores;
TRUNCATE TABLE ziriuz.refresh_tokens;
TRUNCATE TABLE ziriuz.sesiones;
TRUNCATE TABLE ziriuz.usuarios;
TRUNCATE TABLE ziriuz.sedes;
TRUNCATE TABLE ziriuz.clientes;
TRUNCATE TABLE ziriuz.empresas;
TRUNCATE TABLE ziriuz.repuestos;
TRUNCATE TABLE ziriuz.protocolos;
TRUNCATE TABLE ziriuz.resultados;
TRUNCATE TABLE ziriuz.fallas_acciones;
TRUNCATE TABLE ziriuz.fallas_causas;
TRUNCATE TABLE ziriuz.fallas_modos;
TRUNCATE TABLE ziriuz.servicios;
TRUNCATE TABLE ziriuz.modelos;
TRUNCATE TABLE ziriuz.clases;
TRUNCATE TABLE ziriuz.marcas;
TRUNCATE TABLE ziriuz.tipos;
TRUNCATE TABLE ziriuz.areas;
TRUNCATE TABLE ziriuz.municipios;
TRUNCATE TABLE ziriuz.departamentos;

-- ---- 1. DEPARTAMENTOS ----------------------------------------
INSERT INTO ziriuz.departamentos (id, nombre)
SELECT id, nombre FROM ziriuz_memco.departamentos;

-- ---- 2. MUNICIPIOS ------------------------------------------
INSERT INTO ziriuz.municipios (id, nombre, id_departamento)
SELECT id, nombre, id_departamento FROM ziriuz_memco.municipios;

-- ---- 3. EMPRESAS --------------------------------------------
INSERT INTO ziriuz.empresas (id, nombre, nit, direccion, correo, pbx, celular)
SELECT id, nombre, NULLIF(TRIM(nit),''), NULLIF(TRIM(direccion),''), NULLIF(TRIM(correo),''), NULLIF(TRIM(pbx),''), NULLIF(TRIM(celular),'')
FROM ziriuz_memco.empresas;

-- ---- 4. MARCAS, CLASES, MODELOS, AREAS, TIPOS ---------------
INSERT INTO ziriuz.marcas (id, marca)
SELECT id, marca FROM ziriuz_memco.marcas;

INSERT INTO ziriuz.clases (id, clase)
SELECT id, clase FROM ziriuz_memco.clases;

INSERT INTO ziriuz.modelos (id, modelo, id_marca, id_clase)
SELECT id, modelo, id_marca, id_clase FROM ziriuz_memco.modelos;

INSERT INTO ziriuz.areas (id, area)
SELECT id, area FROM ziriuz_memco.areas;

INSERT INTO ziriuz.tipos (id, tipo)
SELECT id, tipo FROM ziriuz_memco.tipos;

-- ---- 5. SERVICIOS, FALLAS, REPUESTOS, PROTOCOLOS ------------
INSERT INTO ziriuz.servicios (id, servicio)
SELECT id, servicio FROM ziriuz_memco.servicios;

INSERT INTO ziriuz.fallas_modos (id, titulo)
SELECT id, titulo FROM ziriuz_memco.fallas_modos;

INSERT INTO ziriuz.fallas_causas (id, titulo)
SELECT id, titulo FROM ziriuz_memco.fallas_causas;

INSERT INTO ziriuz.fallas_acciones (id, titulo)
SELECT id, titulo FROM ziriuz_memco.fallas_acciones;

INSERT INTO ziriuz.repuestos (id, nombre)
SELECT id, nombre FROM ziriuz_memco.repuestos;

INSERT INTO ziriuz.protocolos (id, title)
SELECT id, title FROM ziriuz_memco.protocolos;

-- ---- 6. CLIENTES, SEDES -------------------------------------
INSERT INTO ziriuz.clientes (id, activo, nombre, nit, correo, id_empresa)
SELECT id, activo, nombre,
  NULLIF(TRIM(nit), '') as nit,
  NULLIF(TRIM(correo), '') as correo,
  NULLIF(id_empresa, 0) as id_empresa
FROM ziriuz_memco.clientes;

INSERT INTO ziriuz.sedes (id, activo, nombre, id_cliente, id_municipio, direccion, telefonos, correo)
SELECT id, activo, nombre, id_cliente,
  COALESCE(id_municipio, 1) as id_municipio,
  NULLIF(TRIM(direccion), '') as direccion,
  NULLIF(TRIM(telefonos), '') as telefonos,
  NULLIF(TRIM(correo), '') as correo
FROM ziriuz_memco.sedes
WHERE id_cliente IS NOT NULL;

-- ---- 7. USUARIOS (all get password Ziriuz2024!) -------------
INSERT INTO ziriuz.usuarios (id, usuario, nombre, cedula, correo, telefonos, clave, activo)
SELECT
  u.id,
  COALESCE(u.usuario, CONCAT('user', u.id)) as usuario,
  u.nombre,
  NULLIF(TRIM(u.cedula), '') as cedula,
  NULLIF(TRIM(u.correo), '') as correo,
  NULLIF(TRIM(u.telefonos), '') as telefonos,
  '$2a$10$PsI9CJPZlyn4tx2D.GVG8uL0CJMloCU1QSEbsZs1mofor6IVfs9vW' as clave,
  u.activo
FROM ziriuz_memco.usuarios u;

-- ---- 8. ROLE TABLES (deduplicate per user) ------------------
INSERT INTO ziriuz.administradores (id, id_usuario, activo)
SELECT MIN(id), id_usuario, MAX(activo) FROM ziriuz_memco.administradores
WHERE id_usuario IN (SELECT id FROM ziriuz.usuarios)
GROUP BY id_usuario;

INSERT INTO ziriuz.analistas (id, id_usuario, activo)
SELECT MIN(id), id_usuario, MAX(activo) FROM ziriuz_memco.analistas
WHERE id_usuario IN (SELECT id FROM ziriuz.usuarios)
GROUP BY id_usuario;

INSERT INTO ziriuz.tecnicos (id, id_usuario, activo)
SELECT MIN(id), id_usuario, MAX(activo) FROM ziriuz_memco.tecnicos
WHERE id_usuario IN (SELECT id FROM ziriuz.usuarios)
GROUP BY id_usuario;

INSERT INTO ziriuz.coordinadores (id, id_usuario, activo)
SELECT MIN(id), id_usuario, MAX(activo) FROM ziriuz_memco.coordinadores
WHERE id_usuario IN (SELECT id FROM ziriuz.usuarios)
GROUP BY id_usuario;

INSERT INTO ziriuz.comerciales (id, id_usuario, activo)
SELECT MIN(id), id_usuario, MAX(activo) FROM ziriuz_memco.comerciales
WHERE id_usuario IN (SELECT id FROM ziriuz.usuarios)
GROUP BY id_usuario;

-- ---- 9. USUARIOS VS CLIENTES / SEDES ------------------------
INSERT INTO ziriuz.usuarios_vs_clientes (id, id_usuario, id_cliente)
SELECT id, id_usuario, id_cliente
FROM ziriuz_memco.usuarios_vs_clientes
WHERE id_usuario IN (SELECT id FROM ziriuz.usuarios)
  AND id_cliente IN (SELECT id FROM ziriuz.clientes);

INSERT INTO ziriuz.usuarios_vs_sedes (id, id_usuario, id_sede)
SELECT id, id_usuario, id_sede
FROM ziriuz_memco.usuarios_vs_sedes
WHERE id_usuario IN (SELECT id FROM ziriuz.usuarios)
  AND id_sede IN (SELECT id FROM ziriuz.sedes);

-- ---- 10. EQUIPOS ---------------------------------------------
INSERT INTO ziriuz.equipos (id, activo, id_modelo, id_sede, id_area, id_tipo, serie, activo_fijo, ubicacion, mtto)
SELECT
  e.id,
  e.activo,
  e.id_modelo,
  e.id_sede,
  NULLIF(e.id_area, 0) as id_area,
  NULLIF(e.id_tipo, 0) as id_tipo,
  NULLIF(TRIM(e.serie), '') as serie,
  NULLIF(TRIM(e.activo_fijo), '') as activo_fijo,
  NULLIF(TRIM(e.ubicacion), '') as ubicacion,
  IF(TRIM(e.mtto) = '' OR e.mtto IS NULL OR e.mtto = '0', 0, 1) as mtto
FROM ziriuz_memco.equipos e
WHERE e.id_modelo IS NOT NULL
  AND e.id_sede IN (SELECT id FROM ziriuz.sedes);

-- ---- 11. ESTADOS TABLES ------------------------------------
INSERT INTO ziriuz.solicitudes_estados (id, estado)
SELECT id, estado FROM ziriuz_memco.solicitudes_estados;

INSERT INTO ziriuz.ordenes_estados (id, estado)
SELECT id, estado FROM ziriuz_memco.ordenes_estados;

INSERT INTO ziriuz.ordenes_sub_estados (id, sub_estado)
SELECT id, sub_estado
FROM ziriuz_memco.ordenes_sub_estados;

INSERT INTO ziriuz.visitas_estados (id, estado)
SELECT id, estado FROM ziriuz_memco.visitas_estados;

INSERT INTO ziriuz.cotizaciones_estados (id, estado)
SELECT id, estado FROM ziriuz_memco.cotizaciones_estados;

-- ---- 12. SOLICITUDES (last 365 days) -----------------------
INSERT INTO ziriuz.solicitudes (id, id_equipo, id_servicio, id_creador, id_estado, aviso, observacion, observacion_estado, creacion)
SELECT
  s.id,
  s.id_equipo,
  s.id_servicio,
  s.id_creador,
  s.id_estado,
  NULLIF(TRIM(s.aviso), '') as aviso,
  NULLIF(TRIM(s.observacion), '') as observacion,
  NULLIF(TRIM(s.observacion_estado), '') as observacion_estado,
  s.creacion
FROM ziriuz_memco.solicitudes s
WHERE s.creacion >= DATE_SUB(NOW(), INTERVAL 365 DAY)
  AND s.id_equipo IN (SELECT id FROM ziriuz.equipos)
  AND s.id_servicio IN (SELECT id FROM ziriuz.servicios)
  AND s.id_creador IN (SELECT id FROM ziriuz.usuarios)
  AND s.id_estado IN (SELECT id FROM ziriuz.solicitudes_estados);

-- ---- 13. ORDENES (matching migrated solicitudes) ------------
INSERT INTO ziriuz.ordenes (id, id_solicitud, id_estado, id_creador, id_cerrador, creacion, cierre, total, nombre_recibe, cedula_recibe, solicitar_dado_baja, ids_falla_modos, id_acciones_falla, observaciones_cierre)
SELECT
  o.id,
  o.id_solicitud,
  o.id_estado,
  o.id_creador,
  NULLIF(o.id_cerrador, 0) as id_cerrador,
  o.creacion,
  o.cierre,
  NULLIF(o.total, 0) as total,
  NULLIF(TRIM(o.nombre_recibe), '') as nombre_recibe,
  NULLIF(TRIM(o.cedula_recibe), '') as cedula_recibe,
  o.solicitar_dado_baja,
  NULLIF(TRIM(o.ids_falla_modos), '') as ids_falla_modos,
  NULLIF(o.id_acciones_falla, 0) as id_acciones_falla,
  NULLIF(TRIM(o.observaciones_cierre), '') as observaciones_cierre
FROM ziriuz_memco.ordenes o
WHERE o.id_solicitud IN (SELECT id FROM ziriuz.solicitudes)
  AND o.id_estado IN (SELECT id FROM ziriuz.ordenes_estados)
  AND o.id_creador IN (SELECT id FROM ziriuz.usuarios);

-- ---- 14. ORDENES CAMBIOS ------------------------------------
INSERT INTO ziriuz.ordenes_cambios (id, id_orden, id_sub_estado, id_creador, fecha, comentario)
SELECT
  oc.id,
  oc.id_orden,
  oc.id_sub_estado,
  oc.id_creador,
  oc.fecha,
  NULLIF(TRIM(oc.comentario), '') as comentario
FROM ziriuz_memco.ordenes_cambios oc
WHERE oc.id_orden IN (SELECT id FROM ziriuz.ordenes)
  AND oc.id_creador IN (SELECT id FROM ziriuz.usuarios)
  AND oc.id_sub_estado IS NOT NULL
  AND oc.id_sub_estado IN (SELECT id FROM ziriuz.ordenes_sub_estados);

-- ---- 15. VISITAS (matching migrated ordenes) ----------------
INSERT INTO ziriuz.visitas (id, activo, id_orden, id_estado, id_ejecutador, actividades, fecha_inicio, fecha_cierre, duracion)
SELECT
  v.id,
  v.activo,
  v.id_orden,
  v.id_estado,
  NULLIF(v.id_responsable, 0) as id_ejecutador,
  NULLIF(TRIM(v.actividades), '') as actividades,
  v.fecha_inicio,
  v.fecha_cierre,
  v.duracion
FROM ziriuz_memco.visitas v
WHERE v.id_orden IN (SELECT id FROM ziriuz.ordenes)
  AND v.id_estado IN (SELECT id FROM ziriuz.visitas_estados)
  AND (v.id_responsable IS NULL OR v.id_responsable = 0 OR v.id_responsable IN (SELECT id FROM ziriuz.usuarios));

-- ---- 16. COTIZACIONES (matching migrated ordenes) -----------
INSERT INTO ziriuz.cotizaciones (id, id_cliente, id_orden, creacion, id_creador, id_estado, id_cambiador, cambio_estado, mensaje, observacion_estado, condiciones)
SELECT
  c.id,
  c.id_cliente,
  NULLIF(c.id_orden, 0) as id_orden,
  c.creacion,
  c.id_creador,
  c.id_estado,
  NULLIF(c.id_cambiador, 0) as id_cambiador,
  c.cambio_estado,
  NULLIF(TRIM(c.mensaje), '') as mensaje,
  NULLIF(TRIM(c.observacion_estado), '') as observacion_estado,
  NULLIF(TRIM(c.condiciones), '') as condiciones
FROM ziriuz_memco.cotizaciones c
WHERE c.id_cliente IS NOT NULL
  AND c.id_cliente > 0
  AND c.id_cliente IN (SELECT id FROM ziriuz.clientes)
  AND c.id_estado IN (SELECT id FROM ziriuz.cotizaciones_estados)
  AND c.id_creador IN (SELECT id FROM ziriuz.usuarios)
  AND (c.id_orden IS NULL OR c.id_orden = 0 OR c.id_orden IN (SELECT id FROM ziriuz.ordenes));

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Migration complete' as status;
