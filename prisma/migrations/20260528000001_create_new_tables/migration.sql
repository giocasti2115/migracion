-- Migration: 20260528000001_create_new_tables
-- Additive-only migration: creates new tables and adds new columns to existing ones.
-- NEVER drops or alters existing columns/tables.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. NEW TABLE: refresh_tokens
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id`         VARCHAR(30)  NOT NULL,
  `token`      VARCHAR(255) NOT NULL UNIQUE,
  `id_usuario` INT          NOT NULL,
  `id_sesion`  INT          NOT NULL,
  `expires_at` DATETIME(3)  NOT NULL,
  `revocado`   TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `refresh_tokens_id_usuario_idx` (`id_usuario`),
  INDEX `refresh_tokens_id_sesion_idx` (`id_sesion`),
  CONSTRAINT `fk_refresh_tokens_usuario`
    FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_refresh_tokens_sesion`
    FOREIGN KEY (`id_sesion`) REFERENCES `sesiones` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ADD NEW COLUMNS to existing table: sesiones
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE `sesiones`
  ADD COLUMN IF NOT EXISTS `activa` TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `lat`    DOUBLE     NULL,
  ADD COLUMN IF NOT EXISTS `lng`    DOUBLE     NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ADD NEW COLUMN to existing table: departamentos
--    codigo = DANE department code (e.g. "05" for Antioquia, "11" for Bogotá)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE `departamentos`
  ADD COLUMN IF NOT EXISTS `codigo` VARCHAR(10) NULL UNIQUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ADD NEW COLUMNS to existing table: ordenes
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE `ordenes`
  ADD COLUMN IF NOT EXISTS `observaciones_cierre` TEXT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ADD NEW COLUMNS to existing table: visitas
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE `visitas`
  ADD COLUMN IF NOT EXISTS `fecha_programada`     DATETIME(3)  NULL,
  ADD COLUMN IF NOT EXISTS `observaciones_cierre` TEXT         NULL,
  ADD COLUMN IF NOT EXISTS `motivo_rechazo`       VARCHAR(500) NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ADD NEW COLUMNS to existing table: preventivos
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE `preventivos`
  ADD COLUMN IF NOT EXISTS `id_equipo`       INT          NULL,
  ADD COLUMN IF NOT EXISTS `fecha_programada` DATETIME(3) NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SEED: DANE department codes for Colombia map
--    Only inserts if codigo is still NULL (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE `departamentos` SET `codigo` = '05' WHERE `nombre` LIKE '%Antioquia%'     AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '08' WHERE `nombre` LIKE '%Atlántico%'     AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '11' WHERE `nombre` LIKE '%Bogotá%'        AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '13' WHERE `nombre` LIKE '%Bolívar%'       AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '15' WHERE `nombre` LIKE '%Boyacá%'        AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '17' WHERE `nombre` LIKE '%Caldas%'        AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '18' WHERE `nombre` LIKE '%Caquetá%'       AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '19' WHERE `nombre` LIKE '%Cauca%'         AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '20' WHERE `nombre` LIKE '%Cesar%'         AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '23' WHERE `nombre` LIKE '%Córdoba%'       AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '25' WHERE `nombre` LIKE '%Cundinamarca%'  AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '27' WHERE `nombre` LIKE '%Chocó%'         AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '41' WHERE `nombre` LIKE '%Huila%'         AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '44' WHERE `nombre` LIKE '%La Guajira%'    AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '47' WHERE `nombre` LIKE '%Magdalena%'     AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '50' WHERE `nombre` LIKE '%Meta%'          AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '52' WHERE `nombre` LIKE '%Nariño%'        AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '54' WHERE `nombre` LIKE '%Norte de Santander%' AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '63' WHERE `nombre` LIKE '%Quindío%'       AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '66' WHERE `nombre` LIKE '%Risaralda%'     AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '68' WHERE `nombre` LIKE '%Santander%'     AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '70' WHERE `nombre` LIKE '%Sucre%'         AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '73' WHERE `nombre` LIKE '%Tolima%'        AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '76' WHERE `nombre` LIKE '%Valle del Cauca%' AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '81' WHERE `nombre` LIKE '%Arauca%'        AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '85' WHERE `nombre` LIKE '%Casanare%'      AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '86' WHERE `nombre` LIKE '%Putumayo%'      AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '88' WHERE `nombre` LIKE '%San Andrés%'    AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '91' WHERE `nombre` LIKE '%Amazonas%'      AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '94' WHERE `nombre` LIKE '%Guainía%'       AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '95' WHERE `nombre` LIKE '%Guaviare%'      AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '97' WHERE `nombre` LIKE '%Vaupés%'        AND `codigo` IS NULL;
UPDATE `departamentos` SET `codigo` = '99' WHERE `nombre` LIKE '%Vichada%'       AND `codigo` IS NULL;
