const db = require('../config/db');

const criarNotificacao = (usuario_id, ator_id, tipo, post_id = null) => {
    if (usuario_id === ator_id) {
        return;
    }

    const sql = 'INSERT INTO notificacoes (usuario_id, ator_id, tipo, post_id) VALUES (?, ?, ?, ?)';
    
    db.query(sql, [usuario_id, ator_id, tipo, post_id], (err) => {
        if (err) {
            console.error(err);
        }
    });
};

const verificarMatchWishlist = (dono_id, nome_disco) => {
    const sql = `
        SELECT DISTINCT usuario_id 
        FROM vinis 
        WHERE (adquirido = 0 OR adquirido = FALSE) 
        AND TRIM(LOWER(nome)) = TRIM(LOWER(?)) 
        AND usuario_id != ?
    `;
    
    db.query(sql, [nome_disco, dono_id], (err, results) => {
        if (err) {
            return console.error(err);
        }
        
        results.forEach(row => {
            criarNotificacao(row.usuario_id, dono_id, 'match');
        });
    });
};

module.exports = {
    criarNotificacao,
    verificarMatchWishlist
};