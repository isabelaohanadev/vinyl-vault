const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseEnv } = require('../../src/config/envSchema');

const base = {
    DB_USER: 'u',
    DB_NAME: 'vinylvault_test',
    JWT_SECRET: 'x'.repeat(32)
};

describe('parseEnv', () => {
    it('applies defaults and coerces types', () => {
        const env = parseEnv({ ...base, PORT: '4000', RATE_LIMIT_ENABLED: 'false' });

        assert.equal(env.PORT, 4000);
        assert.equal(env.DB_PORT, 3306);
        assert.equal(env.RATE_LIMIT_ENABLED, false);
        assert.equal(env.NODE_ENV, 'development');
        assert.equal(env.BCRYPT_ROUNDS, 12);
    });

    it('lists every invalid variable in a single readable error', () => {
        assert.throws(
            () => parseEnv({ JWT_SECRET: 'short' }),
            (error) => /DB_USER/.test(error.message) && /DB_NAME/.test(error.message) && /JWT_SECRET/.test(error.message)
        );
    });

    it('rejects a JWT secret shorter than 32 characters', () => {
        assert.throws(() => parseEnv({ ...base, JWT_SECRET: 'x'.repeat(31) }), /JWT_SECRET/);
    });

    it('requires SMTP credentials and a real secret in production', () => {
        assert.throws(() => parseEnv({ ...base, NODE_ENV: 'production' }), /EMAIL_USER/);
        assert.throws(
            () => parseEnv({ ...base, NODE_ENV: 'production', EMAIL_USER: 'a', EMAIL_PASS: 'b', JWT_SECRET: 'change-me'.padEnd(40, '!') }),
            /valor de exemplo/
        );
        assert.doesNotThrow(() => parseEnv({ ...base, NODE_ENV: 'production', EMAIL_USER: 'a', EMAIL_PASS: 'b' }));
    });

    it('returns a frozen object', () => {
        assert.ok(Object.isFrozen(parseEnv(base)));
    });
});
