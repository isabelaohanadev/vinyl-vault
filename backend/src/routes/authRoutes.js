const express = require('express');
const authController = require('../controllers/authController');
const passwordController = require('../controllers/passwordController');
const validate = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const { authLimiter, registerLimiter, emailLimiter } = require('../middlewares/rateLimit');
const { registerBody, loginBody, forgotPasswordBody, resetPasswordBody } = require('../schemas/auth');

const router = express.Router();

router.post('/register', registerLimiter, authLimiter, validate({ body: registerBody }), authController.register);
router.post('/login', authLimiter, validate({ body: loginBody }), authController.login);
router.get('/me', requireAuth, authController.me);

router.post('/forgot-password', emailLimiter, validate({ body: forgotPasswordBody }), passwordController.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordBody }), passwordController.resetPassword);

module.exports = router;
