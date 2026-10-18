const { describe, it, before, beforeEach, afterEach, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const { app, request } = require('../helpers/api');
const { applySchema } = require('../helpers/db');
const database = require('../../src/config/database');
const mailer = require('../../src/config/mailer');

describe('feedback', () => {
    let sent;

    before(applySchema);
    beforeEach(() => {
        sent = [];
        mock.method(mailer, 'send', async (message) => {
            sent.push(message);
        });
    });
    afterEach(() => mock.restoreAll());
    after(() => database.close());

    it('delivers the message to the configured inbox, replyable to the visitor', async () => {
        const res = await request(app).post('/api/feedback').send({ mensagem: 'Adorei o app!', usuario_email: 'fan@example.com', usuario_nome: 'Fã' });

        assert.equal(res.status, 200);
        assert.equal(sent.length, 1);
        assert.equal(sent[0].to, 'feedback@vinylvault.test');
        assert.equal(sent[0].replyTo, 'fan@example.com');
        assert.equal(sent[0].subject, 'Novo Feedback App - Fã');
        assert.match(sent[0].html, /Adorei o app!/);
    });

    it('works anonymously', async () => {
        await request(app).post('/api/feedback').send({ mensagem: 'Sem identificação' }).expect(200);

        assert.equal(sent[0].subject, 'Novo Feedback App - Anônimo');
        assert.equal(sent[0].replyTo, undefined);
    });

    it('escapes HTML so visitors cannot inject markup into the e-mail', async () => {
        await request(app).post('/api/feedback').send({
            mensagem: '<script>alert(1)</script>\n<a href="http://evil.example">clique</a>',
            usuario_nome: '<img src=x onerror=alert(1)>'
        });

        assert.doesNotMatch(sent[0].html, /<script>|<a href|<img/);
        assert.match(sent[0].html, /&lt;script&gt;/);
        assert.match(sent[0].html, /<br>/, 'newlines still render as line breaks');
    });

    it('cannot inject extra mail headers through the name', async () => {
        await request(app).post('/api/feedback').send({ mensagem: 'oi', usuario_nome: 'Fulano\r\nBcc: victim@example.com' });

        assert.doesNotMatch(sent[0].subject, /[\r\n]/);
    });

    it('validates the payload', async () => {
        await request(app).post('/api/feedback').send({}).expect(400);
        await request(app).post('/api/feedback').send({ mensagem: '   ' }).expect(400);
        await request(app).post('/api/feedback').send({ mensagem: 'x'.repeat(2001) }).expect(400);
        await request(app).post('/api/feedback').send({ mensagem: 'oi', usuario_email: 'nao-e-email' }).expect(400);

        assert.equal(sent.length, 0);
    });

    it('reports a 502 (without internals) when the mail provider fails', async () => {
        mock.restoreAll();
        mock.method(mailer, 'send', async () => {
            throw new Error('Invalid login: 535 secret detail');
        });

        const res = await request(app).post('/api/feedback').send({ mensagem: 'oi' });

        assert.equal(res.status, 502);
        assert.doesNotMatch(JSON.stringify(res.body), /535|secret/);
    });
});
