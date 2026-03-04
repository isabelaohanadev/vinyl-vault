const express = require('express');
const healthController = require('../controllers/healthController');
const authRoutes = require('./authRoutes');
const passwordRoutes = require('./passwordRoutes');
const userRoutes = require('./userRoutes');
const vinilRoutes = require('./vinilRoutes');
const classificadosRoutes = require('./classificadosRoutes');

const router = express.Router();

router.get('/health', healthController.checkHealth);

router.use('/', authRoutes);
router.use('/', passwordRoutes);
router.use('/usuarios', userRoutes);
router.use('/vinis', vinilRoutes);
router.use('/classificados', classificadosRoutes);

module.exports = router;