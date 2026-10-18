const express = require('express');
const userController = require('../controllers/userController');
const vinilController = require('../controllers/vinilController');
const postController = require('../controllers/postController');
const communityController = require('../controllers/communityController');
const validate = require('../middlewares/validate');
const { requireAuth, requireSelf } = require('../middlewares/auth');
const { idParam } = require('../schemas/common');
const { updateProfileBody, statusBody } = require('../schemas/user');
const { timelineQuery, pageQuery } = require('../schemas/social');

const router = express.Router();

router.use(requireAuth);

router.get('/:id', validate({ params: idParam }), userController.getProfile);
router.get('/:id/vinis', validate({ params: idParam }), vinilController.getVinisUsuario);
router.get('/:id/posts', validate({ params: idParam, query: timelineQuery.pick({ limite: true, offset: true }) }), postController.getUserPosts);

router.get('/:id/stats', validate({ params: idParam }), communityController.getStatsPerfil);
router.get('/:id/seguidores', validate({ params: idParam, query: pageQuery }), communityController.getSeguidores);
router.get('/:id/seguindo', validate({ params: idParam, query: pageQuery }), communityController.getSeguindo);

router.post('/:id/seguir', validate({ params: idParam }), communityController.seguirUsuario);
router.delete('/:id/seguir', validate({ params: idParam }), communityController.deixarDeSeguirUsuario);

// Only the owner may change or delete an account.
router.put('/:id', validate({ params: idParam }), requireSelf(), validate({ body: updateProfileBody }), userController.updateProfile);
router.delete('/:id', validate({ params: idParam }), requireSelf(), userController.deleteAccount);
router.put('/:id/status', validate({ params: idParam }), requireSelf(), validate({ body: statusBody }), userController.updateStatus);

module.exports = router;
