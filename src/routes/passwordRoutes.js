const express = require('express');
const passwordController = require('../controllers/passwordController');

const router = express.Router();

router.post('/forgot-password', passwordController.forgotPassword);
router.post('/reset-password', passwordController.resetPassword);

module.exports = router;