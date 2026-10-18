const env = require('../config/env');

const silent = env.NODE_ENV === 'test';

const write = (method) => (...args) => {
    if (!silent) {
        console[method](...args);
    }
};

module.exports = {
    info: write('log'),
    warn: write('warn'),
    error: write('error')
};
