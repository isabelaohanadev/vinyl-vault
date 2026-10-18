const express = require('express');
const userController = require('../controllers/userController');
const validate = require('../middlewares/validate');
const { requireAuth, requireSelf } = require('../middlewares/auth');
const { idParam } = require('../schemas/common');
const { updateProfileBody, statusBody } = require('../schemas/user');

const router = express.Router();

router.use(requireAuth);

router.get('/:id', validate({ params: idParam }), userController.getProfile);

// Only the owner may change or delete an account.
router.put('/:id', validate({ params: idParam }), requireSelf(), validate({ body: updateProfileBody }), userController.updateProfile);
router.delete('/:id', validate({ params: idParam }), requireSelf(), userController.deleteAccount);
router.put('/:id/status', validate({ params: idParam }), requireSelf(), validate({ body: statusBody }), userController.updateStatus);

module.exports = router;
