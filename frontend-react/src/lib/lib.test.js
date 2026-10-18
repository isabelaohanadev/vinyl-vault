import { describe, expect, it } from 'vitest';
import { computeBadges } from './badges';
import { cssUrl } from './cssUrl';
import { timeAgo } from './date';
import { splitHashtags } from './hashtags';
import { errorMessage } from './api';

describe('splitHashtags', () => {
    it('separates hashtags from text, including accents and underscores', () => {
        expect(splitHashtags('oi #rock! e #música_boa')).toEqual([
            { text: 'oi ' },
            { text: '#rock', tag: 'rock' },
            { text: '! e ' },
            { text: '#música_boa', tag: 'música_boa' }
        ]);
    });

    it('does not treat a lone # as a tag, and handles empty text', () => {
        expect(splitHashtags('# sozinho')).toEqual([{ text: '# sozinho' }]);
        expect(splitHashtags()).toEqual([]);
    });
});

describe('timeAgo', () => {
    const now = new Date('2026-06-15T12:00:00Z').getTime();
    const ago = (seconds) => new Date(now - seconds * 1000).toISOString();

    it('formats past dates in pt-BR', () => {
        expect(timeAgo(ago(5), now)).toBe('agora há pouco');
        expect(timeAgo(ago(5 * 60), now)).toBe('há 5 minutos');
        expect(timeAgo(ago(3 * 3600), now)).toBe('há 3 horas');
        expect(timeAgo(ago(24 * 3600), now)).toBe('ontem');
        expect(timeAgo(ago(65 * 24 * 3600), now)).toBe('há 2 meses');
    });
});

describe('cssUrl', () => {
    it('wraps plain addresses', () => {
        expect(cssUrl('https://img.example.com/a.png')).toBe('url("https://img.example.com/a.png")');
    });

    it('neutralises characters that could escape the declaration', () => {
        const value = cssUrl('https://x/a.png"); background: red; ("');
        expect(value.startsWith('url("')).toBe(true);
        expect(value.endsWith('")')).toBe(true);
        expect(value.slice(5, -2)).not.toMatch(/["'()\\\s]/);
    });
});

describe('computeBadges', () => {
    it('earns badges from the profile numbers', () => {
        expect(computeBadges({})).toEqual([]);
        expect(computeBadges({ totalVinis: 1 }).map((b) => b.id)).toEqual(['primeiro-disco']);
        expect(computeBadges({ totalVinis: 25, totalTrocas: 1, seguidores: 1, totalPosts: 1 }).map((b) => b.id)).toEqual([
            'primeiro-disco',
            'colecionador-ativo',
            'grande-acervo',
            'trocador',
            'sociavel',
            'narrador'
        ]);
    });
});

describe('errorMessage', () => {
    it('prefers the validation details, then the API message, then the fallback', () => {
        const withDetails = { response: { data: { error: 'Dados inválidos.', details: [{ mensagem: 'E-mail inválido.' }, { mensagem: 'Senha curta.' }] } } };
        expect(errorMessage(withDetails)).toBe('E-mail inválido. Senha curta.');
        expect(errorMessage({ response: { data: { error: 'Credenciais inválidas.' } } })).toBe('Credenciais inválidas.');
        expect(errorMessage({ response: { data: {} } }, 'Falhou.')).toBe('Falhou.');
    });

    it('explains network failures', () => {
        expect(errorMessage({})).toMatch(/conectar ao servidor/);
    });
});
