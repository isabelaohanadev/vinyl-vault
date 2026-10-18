const express = require('express');
const vinilController = require('../controllers/vinilController');
const validate = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const { idParam } = require('../schemas/common');
const { createBody, updateBody } = require('../schemas/vinil');

const router = express.Router();

router.use(requireAuth);

router.post('/', validate({ body: createBody }), vinilController.addVinil);
router.get('/:id', validate({ params: idParam }), vinilController.getVinil);
router.put('/:id', validate({ params: idParam, body: updateBody }), vinilController.updateVinil);
router.delete('/:id', validate({ params: idParam }), vinilController.deleteVinil);

module.exports = router;
