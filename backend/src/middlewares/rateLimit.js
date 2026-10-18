const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const createLimiter = (options, enabled = env.RATE_LIMIT_ENABLED) => {
    if (!enabled) {
        return (req, res, next) => next();
    }

    return rateLimit({
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: 'Muitas requisições. Tente novamente em instantes.' },
        ...options
    });
};

const MINUTE = 60 * 1000;

module.exports = {
    createLimiter,
    // Whole API, per IP.
    apiLimiter: createLimiter({ windowMs: 15 * MINUTE, limit: 600 }),
    // Login / register / reset: brute-force protection. Successful logins do not count.
    authLimiter: createLimiter({ windowMs: 15 * MINUTE, limit: 20, skipSuccessfulRequests: true }),
    // Endpoints that send e-mail.
    emailLimiter: createLimiter({ windowMs: 60 * MINUTE, limit: 5 })
};
