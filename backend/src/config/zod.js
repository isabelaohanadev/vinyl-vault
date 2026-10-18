const { z } = require('zod');

// Portuguese (Brazil) validation messages. Zod's bundled "pt" locale is
// European Portuguese, which reads oddly in a pt-BR app.
z.config({
    customError: (issue) => {
        switch (issue.code) {
            case 'invalid_type':
                return issue.input === undefined ? 'Campo obrigatório.' : 'Tipo de dado inválido.';
            case 'too_small':
                return issue.origin === 'string'
                    ? (issue.minimum === 1 ? 'Campo obrigatório.' : `Deve ter no mínimo ${issue.minimum} caracteres.`)
                    : `Deve ser no mínimo ${issue.minimum}.`;
            case 'too_big':
                return issue.origin === 'string'
                    ? `Deve ter no máximo ${issue.maximum} caracteres.`
                    : `Deve ser no máximo ${issue.maximum}.`;
            case 'invalid_format':
                if (issue.format === 'email') return 'E-mail inválido.';
                if (issue.format === 'url') return 'URL inválida.';
                return 'Formato inválido.';
            case 'invalid_value':
                return 'Valor não permitido.';
            case 'unrecognized_keys':
                return 'Campo desconhecido.';
            default:
                return undefined;
        }
    }
});

module.exports = z;
