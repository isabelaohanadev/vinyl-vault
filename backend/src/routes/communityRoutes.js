const express = require('express');
const communityController = require('../controllers/communityController');
const validate = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const { listQuery } = require('../schemas/vinil');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: listQuery }), communityController.getComunidade);

module.exports = router;
