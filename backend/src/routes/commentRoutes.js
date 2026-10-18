const express = require('express');
const postController = require('../controllers/postController');
const validate = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const { idParam } = require('../schemas/common');

const router = express.Router();

router.use(requireAuth);

router.delete('/:id', validate({ params: idParam }), postController.deleteComment);

module.exports = router;
