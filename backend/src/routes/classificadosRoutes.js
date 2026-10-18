const express = require('express');
const vinilController = require('../controllers/vinilController');
const validate = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const { listQuery } = require('../schemas/vinil');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: listQuery }), vinilController.getClassificados);

module.exports = router;
