const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { signToken, verifyToken, hashToken, generateResetToken } = require('../../src/utils/token');

describe('JWT helpers', () => {
    it('round-trips the user id and username', () => {
        const payload = verifyToken(signToken({ id: 42, username: 'ana' }));

        assert.equal(payload.sub, '42');
        assert.equal(payload.username, 'ana');
        assert.ok(payload.exp > payload.iat);
    });

    it('rejects tampered, expired and unsigned tokens', () => {
        const token = signToken({ id: 1, username: 'a' });
        const expired = jwt.sign({ username: 'a' }, process.env.JWT_SECRET, { subject: '1', expiresIn: -10 });
        const unsigned = jwt.sign({ username: 'a' }, '', { algorithm: 'none', subject: '1' });
        const wrongSecret = jwt.sign({ username: 'a' }, 'another-secret-another-secret-123456', { subject: '1' });

        assert.throws(() => verifyToken(`${token}x`));
        assert.throws(() => verifyToken(expired), /expired/);
        assert.throws(() => verifyToken(unsigned));
        assert.throws(() => verifyToken(wrongSecret));
    });
});

describe('reset token helpers', () => {
    it('stores only a hash that matches the emailed token', () => {
        const { token, hash } = generateResetToken();

        assert.match(token, /^[0-9a-f]{64}$/);
        assert.equal(hash, hashToken(token));
        assert.notEqual(hash, token);
        assert.equal(hash.length, 64);
    });

    it('generates a different token every time', () => {
        assert.notEqual(generateResetToken().token, generateResetToken().token);
    });
});
