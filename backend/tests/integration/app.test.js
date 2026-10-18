const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/app');
const database = require('../../src/config/database');
const { applySchema } = require('../helpers/db');

describe('app', () => {
    before(applySchema);
    after(() => database.close());

    it('GET /api/health reports the database as up', async () => {
        const res = await request(app).get('/api/health');

        assert.equal(res.status, 200);
        assert.equal(res.body.status, 'ok');
        assert.equal(res.body.database, 'up');
    });

    it('sets security headers and hides the framework', async () => {
        const res = await request(app).get('/api/health');

        assert.equal(res.headers['x-powered-by'], undefined);
        assert.equal(res.headers['x-content-type-options'], 'nosniff');
        assert.ok(res.headers['content-security-policy']);
    });

    it('only allows the configured CORS origin', async () => {
        const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
        const denied = await request(app).get('/api/health').set('Origin', 'https://evil.example');

        assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:5173');
        assert.equal(denied.headers['access-control-allow-origin'], undefined);
    });

    it('answers unknown routes with a JSON 404', async () => {
        const res = await request(app).get('/api/nao-existe');

        assert.equal(res.status, 404);
        assert.deepEqual(res.body, { error: 'Rota não encontrada.' });
    });
});
