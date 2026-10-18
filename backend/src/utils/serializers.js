// What the owner of an account gets to see about themselves.
const serializeUser = (row) => ({
    id: row.id,
    email: row.email,
    nome_completo: row.nome_completo,
    username: row.username,
    bio: row.bio ?? null,
    foto_perfil: row.foto_perfil ?? null,
    tocando_agora: row.tocando_agora ?? null,
    data_nascimento: row.data_nascimento ?? null
});

// What everybody else sees: never the e-mail or birth date.
const serializePublicUser = (row) => ({
    id: row.id,
    nome_completo: row.nome_completo,
    username: row.username,
    bio: row.bio ?? null,
    foto_perfil: row.foto_perfil ?? null,
    tocando_agora: row.tocando_agora ?? null
});

// MySQL returns TINYINT(1) as 0/1; the API speaks real booleans.
const serializeVinil = (row) => ({
    id: row.id,
    usuario_id: row.usuario_id,
    nome: row.nome,
    artista: row.artista,
    genero: row.genero ?? null,
    ano: row.ano ?? null,
    spotify: row.spotify ?? null,
    adquirido: Boolean(row.adquirido),
    foto: row.foto ?? null,
    negociavel: Boolean(row.negociavel),
    preview_url: row.preview_url ?? null,
    nota: row.nota ?? 0,
    estado_capa: row.estado_capa ?? null,
    estado_disco: row.estado_disco ?? null,
    criadoEm: row.criadoEm
});

// Expects rows from the post queries, which alias the author as autor_* and
// add likes_count / comments_count / user_liked.
const serializePost = (row) => ({
    id: row.id,
    usuario_id: row.usuario_id,
    foto: row.foto ?? null,
    legenda: row.legenda ?? null,
    criado_em: row.criado_em,
    likes_count: Number(row.likes_count),
    comments_count: Number(row.comments_count),
    user_liked: Boolean(row.user_liked),
    autor: {
        id: row.usuario_id,
        username: row.autor_username,
        nome_completo: row.autor_nome_completo,
        foto_perfil: row.autor_foto_perfil ?? null
    }
});

module.exports = { serializeUser, serializePublicUser, serializeVinil, serializePost };
