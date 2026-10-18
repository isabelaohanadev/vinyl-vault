const checkHealth = (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API is running' });
};

module.exports = {
    checkHealth
};