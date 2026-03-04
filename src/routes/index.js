const express = require('express');
const healthController = require('../controllers/healthController');
const authRoutes = require('./authRoutes');
const passwordRoutes = require('./passwordRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();

router.get('/health', healthController.checkHealth);

router.use('/', authRoutes);
router.use('/', passwordRoutes);
router.use('/usuarios', userRoutes);

module.exports = router;