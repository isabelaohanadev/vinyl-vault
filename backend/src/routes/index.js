const express = require('express');
const healthController = require('../controllers/healthController');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const vinilRoutes = require('./vinilRoutes');
const classificadosRoutes = require('./classificadosRoutes');
const communityRoutes = require('./communityRoutes');
const postRoutes = require('./postRoutes');
const commentRoutes = require('./commentRoutes');
const notificationRoutes = require('./notificationRoutes');
const chatRoutes = require('./chatRoutes');
const feedbackRoutes = require('./feedbackRoutes');

const router = express.Router();

router.get('/health', healthController.checkHealth);

router.use('/auth', authRoutes);
router.use('/usuarios', userRoutes);
router.use('/vinis', vinilRoutes);
router.use('/classificados', classificadosRoutes);
router.use('/comunidade', communityRoutes);
router.use('/posts', postRoutes);
router.use('/comentarios', commentRoutes);
router.use('/notificacoes', notificationRoutes);
router.use('/mensagens', chatRoutes);
router.use('/conversas', chatRoutes);
router.use('/feedback', feedbackRoutes);

module.exports = router;