const database = require('../config/database');

const checkHealth = async (req, res) => {
    try {
        await database.ping();
        res.status(200).json({ status: 'ok', database: 'up', uptime: Math.round(process.uptime()) });
    } catch {
        res.status(503).json({ status: 'error', database: 'down' });
    }
};

module.exports = {
    checkHealth
};
