const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/app');

let counter = 0;

// Registers a user through the real endpoint and returns it with its JWT.
const registerUser = async (overrides = {}) => {
    counter += 1;
    const body = {
        email: `user${counter}@test.com`,
        nome_completo: `User ${counter}`,
        username: `user${counter}`,
        senha: 'senha-segura-123',
        ...overrides
    };

    const res = await request(app).post('/api/auth/register').send(body);
    assert.equal(res.status, 201, `register failed: ${JSON.stringify(res.body)}`);

    return { ...res.body.usuario, token: res.body.token, senha: body.senha };
};

const asUser = (user) => ({ Authorization: `Bearer ${user.token}` });

module.exports = { app, request, registerUser, asUser };
