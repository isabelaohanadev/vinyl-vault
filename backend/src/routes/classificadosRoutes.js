const express = require('express');
const vinilController = require('../controllers/vinilController');

const router = express.Router();

router.get('/:meu_id', vinilController.getClassificados);

module.exports = router;