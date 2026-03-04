const express = require('express');
const vinilController = require('../controllers/vinilController');

const router = express.Router();

router.get('/:usuario_id', vinilController.getVinisUsuario);
router.post('/', vinilController.addVinil);
router.put('/:id', vinilController.updateVinil);
router.delete('/:id', vinilController.deleteVinil);

module.exports = router;