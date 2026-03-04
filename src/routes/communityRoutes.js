const express = require('express');
const communityController = require('../controllers/communityController');

const router = express.Router();

router.get('/:meu_id', communityController.getComunidade);

module.exports = router;