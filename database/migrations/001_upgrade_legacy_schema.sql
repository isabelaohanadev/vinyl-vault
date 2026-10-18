-- Upgrade a database created by the original (pre-refactor) version.
--
-- Run ONCE, after taking a backup:
--   mysql -u <user> -p <database> < database/migrations/001_upgrade_legacy_schema.sql
--
-- New databases do not need this file: use database/schema.sql instead.

-- 1. The reset token is now stored as a SHA-256 hex digest (64 chars, was 40).
--    Tokens issued before the upgrade stop working, which is the safe default.
ALTER TABLE usuarios
    MODIFY reset_token VARCHAR(64) NULL;
UPDATE usuarios SET reset_token = NULL, reset_token_expires = NULL;

-- 2. Vinyl release year and media condition (new in the React frontend).
ALTER TABLE vinis
    ADD COLUMN ano          SMALLINT UNSIGNED NULL AFTER genero,
    ADD COLUMN estado_capa  ENUM('M','NM','VG+','VG','G','P') NULL,
    ADD COLUMN estado_disco ENUM('M','NM','VG+','VG','G','P') NULL;

-- 3. Optional but recommended: forbid duplicate likes and follows (this also
--    makes toggling a like safe under concurrent requests). If these fail with
--    "Duplicate entry", remove the duplicate rows first and re-run them.
ALTER TABLE curtidas   ADD UNIQUE KEY uq_curtidas_par (usuario_id, post_id);
ALTER TABLE seguidores ADD UNIQUE KEY uq_seguidores_par (seguidor_id, seguido_id);
