const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const env = require('../config/env');
const { verifyToken } = require('../utils/token');

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

// Signed-in users get their own budget (people behind one office or school IP must not
// share it); everybody else is counted per IP. An invalid token falls back to the IP, so
// it cannot be used to dodge the limit.
const keyByUserOrIp = (req) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');

    if (scheme === 'Bearer' && token) {
        try {
            return `user:${verifyToken(token).sub}`;
        } catch {
            // fall through to the IP
        }
    }

    return `ip:${ipKeyGenerator(req.ip)}`;
};

const MINUTE = 60 * 1000;

module.exports = {
    createLimiter,
    keyByUserOrIp,
    // Whole API. The web app polls notifications and chat every few seconds, hence the
    // generous per-user budget.
    apiLimiter: createLimiter({ windowMs: 15 * MINUTE, limit: 1500, keyGenerator: keyByUserOrIp }),
    // Login / reset: brute-force protection. Successful requests do not count.
    authLimiter: createLimiter({ windowMs: 15 * MINUTE, limit: 20, skipSuccessfulRequests: true }),
    // Sign-up counts every attempt: successful ones must not be unlimited either.
    registerLimiter: createLimiter({ windowMs: 60 * MINUTE, limit: 10 }),
    // Endpoints that send e-mail.
    emailLimiter: createLimiter({ windowMs: 60 * MINUTE, limit: 5 })
};
