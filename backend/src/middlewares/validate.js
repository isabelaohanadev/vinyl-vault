require('../config/zod');
const { badRequest } = require('../utils/httpError');

const SOURCES = ['params', 'query', 'body'];

// Validates req.params / req.query / req.body against zod schemas. Parsed
// (coerced, defaulted, trimmed) values land in req.valid; req.query is a
// read-only getter in Express 5, so nothing is reassigned on req itself.
const validate = (schemas) => (req, res, next) => {
    const valid = {};
    const issues = [];

    for (const source of SOURCES) {
        if (!schemas[source]) {
            continue;
        }

        const result = schemas[source].safeParse(req[source] ?? {});

        if (result.success) {
            valid[source] = result.data;
        } else {
            issues.push(
                ...result.error.issues.map((issue) => ({
                    campo: issue.path.join('.') || source,
                    mensagem: issue.message
                }))
            );
        }
    }

    if (issues.length > 0) {
        return next(badRequest('Dados inválidos.', issues));
    }

    // Merge so several validate() calls can be chained on one route.
    req.valid = { ...req.valid, ...valid };
    return next();
};

module.exports = validate;
