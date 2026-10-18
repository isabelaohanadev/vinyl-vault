const express = require('express');
const chatController = require('../controllers/chatController');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.get('/', requireAuth, chatController.getConversas);

module.exports = router;
