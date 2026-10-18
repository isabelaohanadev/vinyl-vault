const express = require('express');
const feedbackController = require('../controllers/feedbackController');
const validate = require('../middlewares/validate');
const { emailLimiter } = require('../middlewares/rateLimit');
const { feedbackBody } = require('../schemas/feedback');

const router = express.Router();

// Public on purpose (visitors can write to us), so it is strictly rate limited.
router.post('/', emailLimiter, validate({ body: feedbackBody }), feedbackController.enviarFeedback);

module.exports = router;
