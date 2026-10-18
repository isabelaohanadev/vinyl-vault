const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    { ignores: ['node_modules/', 'vendor/'] },
    js.configs.recommended,
    {
        files: ['scripts/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: { ...globals.browser, Chart: 'readonly', html2pdf: 'readonly' }
        },
        rules: {
            // The screens share their functions and state through the global scope (classic <script>
            // tags and inline onclick handlers), so names cannot be resolved file by file.
            'no-undef': 'off',
            'no-unused-vars': 'off',
            // The templates start from an empty string and then fill it in every branch of an if/else.
            'no-useless-assignment': 'off'
        }
    },
    {
        files: ['dev-server.js', 'tools/**/*.js', 'eslint.config.js'],
        languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs', globals: globals.node }
    }
];
