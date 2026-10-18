const { pool } = require('../config/database');
const notificationService = require('../services/notificationService');
const { forbidden, notFound } = require('../utils/httpError');
const { serializeVinil } = require('../utils/serializers');
const { likeContains } = require('../utils/sql');

const WRITABLE = ['nome', 'artista', 'genero', 'ano', 'spotify', 'adquirido', 'foto', 'negociavel', 'preview_url', 'nota', 'estado_capa', 'estado_disco'];

const findVinil = async (id) => {
    const [rows] = await pool.execute('SELECT * FROM vinis WHERE id = ?', [id]);

    if (rows.length === 0) {
        throw notFound('Disco não encontrado.');
    }

    return rows[0];
};

const findOwnedVinil = async (id, userId) => {
    const vinil = await findVinil(id);

    if (vinil.usuario_id !== userId) {
        throw forbidden('Este disco pertence a outro colecionador.');
    }

    return vinil;
};

const getVinisUsuario = async (req, res) => {
    const { id } = req.valid.params;

    const [users] = await pool.execute('SELECT id FROM usuarios WHERE id = ?', [id]);

    if (users.length === 0) {
        throw notFound('Usuário não encontrado.');
    }

    const [rows] = await pool.execute('SELECT * FROM vinis WHERE usuario_id = ? ORDER BY criadoEm DESC, id DESC', [id]);

    res.status(200).json(rows.map(serializeVinil));
};

const getVinil = async (req, res) => {
    res.status(200).json(serializeVinil(await findVinil(req.valid.params.id)));
};

const addVinil = async (req, res) => {
    const body = req.valid.body;
    const values = WRITABLE.map((field) => body[field] ?? null);

    const [result] = await pool.execute(
        `INSERT INTO vinis (usuario_id, ${WRITABLE.join(', ')}) VALUES (?, ${WRITABLE.map(() => '?').join(', ')})`,
        [req.user.id, ...values]
    );

    if (body.negociavel) {
        await notificationService.verificarMatchWishlist(req.user.id, body.nome);
    }

    const vinil = await findVinil(result.insertId);

    res.status(201).json({ message: 'Salvo!', vinil: serializeVinil(vinil) });
};

const updateVinil = async (req, res) => {
    const { id } = req.valid.params;
    const body = req.valid.body;

    const before = await findOwnedVinil(id, req.user.id);

    const fields = WRITABLE.filter((field) => body[field] !== undefined);

    await pool.execute(`UPDATE vinis SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`, [...fields.map((field) => body[field]), id]);

    const vinil = await findVinil(id);

    // Only announce a record when it becomes tradable (or is renamed while tradable),
    // not on every edit.
    const justBecameTradable = Boolean(vinil.negociavel) && (!before.negociavel || before.nome !== vinil.nome);

    if (justBecameTradable) {
        await notificationService.verificarMatchWishlist(req.user.id, vinil.nome);
    }

    res.status(200).json({ message: 'Disco atualizado!', vinil: serializeVinil(vinil) });
};

const deleteVinil = async (req, res) => {
    await findOwnedVinil(req.valid.params.id, req.user.id);

    await pool.execute('DELETE FROM vinis WHERE id = ?', [req.valid.params.id]);

    res.status(200).json({ message: 'Disco removido!' });
};

const getClassificados = async (req, res) => {
    const { busca, limite, offset } = req.valid.query;

    const conditions = ['v.negociavel = 1', 'v.usuario_id <> ?'];
    const params = [req.user.id];

    if (busca) {
        conditions.push('(v.nome LIKE ? OR v.artista LIKE ?)');
        params.push(likeContains(busca), likeContains(busca));
    }

    // limite/offset are integers validated by zod, so they are safe to inline
    // (MySQL rejects placeholders in LIMIT for prepared statements on some versions).
    const [rows] = await pool.execute(
        `SELECT v.*, u.nome_completo AS dono_nome_completo, u.username AS dono_username, u.foto_perfil AS dono_foto_perfil
         FROM vinis v
         JOIN usuarios u ON v.usuario_id = u.id
         WHERE ${conditions.join(' AND ')}
         ORDER BY v.criadoEm DESC, v.id DESC
         LIMIT ${limite} OFFSET ${offset}`,
        params
    );

    res.status(200).json(
        rows.map((row) => ({
            ...serializeVinil(row),
            dono: {
                id: row.usuario_id,
                nome_completo: row.dono_nome_completo,
                username: row.dono_username,
                foto_perfil: row.dono_foto_perfil ?? null
            }
        }))
    );
};

module.exports = {
    getVinisUsuario,
    getVinil,
    addVinil,
    updateVinil,
    deleteVinil,
    getClassificados
};
