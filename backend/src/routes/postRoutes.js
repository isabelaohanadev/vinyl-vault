const express = require('express');
const postController = require('../controllers/postController');
const validate = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const { idParam } = require('../schemas/common');
const { timelineQuery, createPostBody, updatePostBody, commentBody } = require('../schemas/social');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: timelineQuery }), postController.getTimeline);
router.post('/', validate({ body: createPostBody }), postController.createPost);

router.get('/:id', validate({ params: idParam }), postController.getPostById);
router.put('/:id', validate({ params: idParam, body: updatePostBody }), postController.updatePost);
router.delete('/:id', validate({ params: idParam }), postController.deletePost);

router.post('/:id/curtir', validate({ params: idParam }), postController.toggleLike);
router.get('/:id/curtidas', validate({ params: idParam }), postController.getPostLikes);

router.get('/:id/comentarios', validate({ params: idParam }), postController.getComments);
router.post('/:id/comentarios', validate({ params: idParam, body: commentBody }), postController.addComment);

module.exports = router;
