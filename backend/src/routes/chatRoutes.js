const express = require('express');
const chatController = require('../controllers/chatController');

const router = express.Router();

router.get('/naolidas/:usuario_id', chatController.getNaoLidas);
router.put('/ler', chatController.marcarMensagensComoLidas);
router.get('/conversas/:meu_id', chatController.getConversas);
router.get('/:meu_id/:amigo_id', chatController.getMensagens);
router.post('/', chatController.enviarMensagem);

module.exports = router;