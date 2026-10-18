-- Vinyl Vault - MySQL 8 schema
--
-- Idempotent: safe to run on an empty database or re-run on an existing one.
-- Column names follow the original (Portuguese) API, including vinis.criadoEm,
-- so databases created by earlier versions stay compatible. If you already have
-- a database from an earlier version, apply database/migrations/ instead.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
    id                   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    email                VARCHAR(255)  NOT NULL,
    nome_completo        VARCHAR(150)  NOT NULL,
    data_nascimento      DATE          NULL,
    bio                  VARCHAR(500)  NULL,
    username             VARCHAR(30)   NOT NULL,
    senha                VARCHAR(255)  NOT NULL COMMENT 'bcrypt hash',
    foto_perfil          MEDIUMTEXT    NULL     COMMENT 'image URL or data URI',
    tocando_agora        VARCHAR(255)  NULL,
    reset_token          VARCHAR(64)   NULL     COMMENT 'SHA-256 of the emailed token',
    reset_token_expires  DATETIME      NULL,
    criado_em            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_email (email),
    UNIQUE KEY uq_usuarios_username (username),
    KEY idx_usuarios_reset_token (reset_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vinis (
    id            INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    usuario_id    INT UNSIGNED      NOT NULL,
    nome          VARCHAR(255)      NOT NULL,
    artista       VARCHAR(255)      NOT NULL,
    genero        VARCHAR(100)      NULL,
    ano           SMALLINT UNSIGNED NULL,
    spotify       VARCHAR(500)      NULL,
    adquirido     TINYINT(1)        NOT NULL DEFAULT 1 COMMENT '1 = in collection, 0 = wishlist',
    foto          MEDIUMTEXT        NULL,
    negociavel    TINYINT(1)        NOT NULL DEFAULT 0 COMMENT 'listed in the classifieds',
    preview_url   VARCHAR(1000)     NULL,
    nota          TINYINT UNSIGNED  NOT NULL DEFAULT 0,
    estado_capa   ENUM('M','NM','VG+','VG','G','P') NULL,
    estado_disco  ENUM('M','NM','VG+','VG','G','P') NULL,
    criadoEm      TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_vinis_usuario (usuario_id, criadoEm),
    KEY idx_vinis_classificados (negociavel, criadoEm),
    KEY idx_vinis_nome (nome),
    CONSTRAINT fk_vinis_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seguidores (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    seguidor_id  INT UNSIGNED NOT NULL,
    seguido_id   INT UNSIGNED NOT NULL,
    criado_em    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_seguidores_par (seguidor_id, seguido_id),
    KEY idx_seguidores_seguido (seguido_id),
    CONSTRAINT fk_seguidores_seguidor FOREIGN KEY (seguidor_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_seguidores_seguido FOREIGN KEY (seguido_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT ck_seguidores_distintos CHECK (seguidor_id <> seguido_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id  INT UNSIGNED NOT NULL,
    foto        MEDIUMTEXT   NULL,
    legenda     TEXT         NULL,
    criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_posts_usuario (usuario_id, criado_em),
    KEY idx_posts_criado_em (criado_em),
    CONSTRAINT fk_posts_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS curtidas (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id  INT UNSIGNED NOT NULL,
    post_id     INT UNSIGNED NOT NULL,
    criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_curtidas_par (usuario_id, post_id),
    KEY idx_curtidas_post (post_id),
    CONSTRAINT fk_curtidas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_curtidas_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comentarios (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id  INT UNSIGNED NOT NULL,
    post_id     INT UNSIGNED NOT NULL,
    texto       TEXT         NOT NULL,
    parent_id   INT UNSIGNED NULL COMMENT 'reply to another comment',
    criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_comentarios_post (post_id, criado_em),
    CONSTRAINT fk_comentarios_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_comentarios_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_comentarios_parent FOREIGN KEY (parent_id) REFERENCES comentarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mensagens (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    remetente_id     INT UNSIGNED NOT NULL,
    destinatario_id  INT UNSIGNED NOT NULL,
    texto            TEXT         NULL,
    vinil_id         INT UNSIGNED NULL COMMENT 'vinyl shared in the message',
    lida             TINYINT(1)   NOT NULL DEFAULT 0,
    criado_em        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_mensagens_par (remetente_id, destinatario_id, criado_em),
    KEY idx_mensagens_destinatario (destinatario_id, lida),
    CONSTRAINT fk_mensagens_remetente FOREIGN KEY (remetente_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_mensagens_destinatario FOREIGN KEY (destinatario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_mensagens_vinil FOREIGN KEY (vinil_id) REFERENCES vinis (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notificacoes (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id  INT UNSIGNED NOT NULL COMMENT 'who receives it',
    ator_id     INT UNSIGNED NOT NULL COMMENT 'who caused it',
    tipo        ENUM('curtida','comentario','seguir','mensagem','match') NOT NULL,
    post_id     INT UNSIGNED NULL,
    lida        TINYINT(1)   NOT NULL DEFAULT 0,
    criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notificacoes_usuario (usuario_id, criado_em),
    CONSTRAINT fk_notificacoes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_notificacoes_ator FOREIGN KEY (ator_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_notificacoes_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
