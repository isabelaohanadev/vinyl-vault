const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const ALGORITHM = 'HS256';

const signToken = (user) =>
    jwt.sign({ username: user.username }, env.JWT_SECRET, {
        algorithm: ALGORITHM,
        subject: String(user.id),
        expiresIn: env.JWT_EXPIRES_IN
    });

const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// The raw token is e-mailed to the user; only its hash is stored, so a leaked
// database cannot be used to take over accounts.
const generateResetToken = () => {
    const token = crypto.randomBytes(32).toString('hex');
    return { token, hash: hashToken(token) };
};

module.exports = { signToken, verifyToken, hashToken, generateResetToken };
