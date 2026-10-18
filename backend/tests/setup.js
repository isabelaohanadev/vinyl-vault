// Preloaded by `npm test` (node --require). Runs before any application code, so
// the API can never pick up the real backend/.env (database, SMTP credentials).
process.env.NODE_ENV = 'test';

// Run in a non-UTC zone on purpose: timestamps must stay correct when Node and
// MySQL disagree about the time zone (they usually do outside of Docker).
process.env.TZ = 'America/Sao_Paulo';

process.env.DB_HOST = process.env.TEST_DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.TEST_DB_PORT || '3307';
process.env.DB_USER = process.env.TEST_DB_USER || 'vinyl';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD ?? 'vinyl';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'vinylvault_test';

process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-0123';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '4';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.EMAIL_USER = '';
process.env.EMAIL_PASS = '';
process.env.FEEDBACK_TO = 'feedback@vinylvault.test';

if (!/_test$/.test(process.env.DB_NAME)) {
    throw new Error(`Refusing to run tests against "${process.env.DB_NAME}": the database name must end with "_test" because tests wipe every table.`);
}
