const { verifyToken } = require('../utils/token');
const { unauthorized, forbidden } = require('../utils/httpError');

const requireAuth = (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');

    if (scheme !== 'Bearer' || !token) {
        return next(unauthorized());
    }

    try {
        const payload = verifyToken(token);
        req.user = { id: Number(payload.sub), username: payload.username };
        return next();
    } catch {
        return next(unauthorized('Sessão inválida ou expirada. Faça login novamente.'));
    }
};

// Restricts a route to the authenticated user's own resource, e.g. /usuarios/:id.
const requireSelf = (param = 'id') => (req, res, next) => {
    if (Number(req.params[param]) !== req.user.id) {
        return next(forbidden());
    }

    return next();
};

module.exports = { requireAuth, requireSelf };
