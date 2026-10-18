const { z } = require('./common');

const listQuery = z.object({
    limite: z.coerce.number().int().min(1).max(100).default(30)
});

module.exports = { listQuery };
