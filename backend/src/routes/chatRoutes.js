const express = require('express');
const chatController = require('../controllers/chatController');
const validate = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const { sendMessageBody, friendParam, historyQuery, markReadBody } = require('../schemas/chat');

const router = express.Router();

router.use(requireAuth);

// Fixed paths first so they are not captured by /:amigo_id.
router.get('/nao-lidas', chatController.getNaoLidas);
router.put('/ler', validate({ body: markReadBody }), chatController.marcarMensagensComoLidas);

router.post('/', validate({ body: sendMessageBody }), chatController.enviarMensagem);
router.get('/:amigo_id', validate({ params: friendParam, query: historyQuery }), chatController.getMensagens);

module.exports = router;
