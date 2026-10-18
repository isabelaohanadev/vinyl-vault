// Never load backend/.env under test: tests must not see real database or SMTP credentials.
if (process.env.NODE_ENV !== 'test') {
    require('dotenv').config({ quiet: true });
}

const { parseEnv } = require('./envSchema');

module.exports = parseEnv(process.env);
