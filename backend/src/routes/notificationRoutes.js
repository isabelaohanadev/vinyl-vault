const express = require('express');
const notificationController = require('../controllers/notificationController');
const validate = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const { idParam } = require('../schemas/common');
const { listQuery } = require('../schemas/notification');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: listQuery }), notificationController.getNotificacoes);
router.get('/nao-lidas', notificationController.getNaoLidas);
router.put('/ler-todas', notificationController.marcarTodasComoLidas);
router.put('/:id/ler', validate({ params: idParam }), notificationController.marcarComoLida);

module.exports = router;
