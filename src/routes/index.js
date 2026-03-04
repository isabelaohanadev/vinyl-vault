const express = require('express');
const healthController = require('../controllers/healthController');
const authRoutes = require('./authRoutes');
const passwordRoutes = require('./passwordRoutes');
const userRoutes = require('./userRoutes');
const vinilRoutes = require('./vinilRoutes');
const classificadosRoutes = require('./classificadosRoutes');
const communityRoutes = require('./communityRoutes');
const socialRoutes = require('./socialRoutes');
const notificationRoutes = require('./notificationRoutes');
const chatRoutes = require('./chatRoutes');
const feedbackRoutes = require('./feedbackRoutes');

const router = express.Router();

router.get('/health', healthController.checkHealth);

router.use('/auth', authRoutes);
router.use('/', passwordRoutes);
router.use('/usuarios', userRoutes);
router.use('/vinis', vinilRoutes);
router.use('/classificados', classificadosRoutes);
router.use('/comunidade', communityRoutes);
router.use('/posts', socialRoutes);
router.use('/notificacoes', notificationRoutes);
router.use('/mensagens', chatRoutes);
router.use('/conversas', chatRoutes);
router.use('/feedback', feedbackRoutes);

module.exports = router;