const express = require('express');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.get('/:usuario_id', notificationController.getNotificacoes);
router.put('/ler/:id', notificationController.marcarComoLida);

module.exports = router;