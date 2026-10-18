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

module.exports = { serializeUser, serializePublicUser };
