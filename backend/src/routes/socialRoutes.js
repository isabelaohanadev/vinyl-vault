const express = require('express');
const communityController = require('../controllers/communityController');
const postController = require('../controllers/postController');

const router = express.Router();

router.post('/seguir', communityController.seguirUsuario);
router.delete('/seguir/:seguidor_id/:seguido_id', communityController.deixarDeSeguirUsuario);

router.get('/perfil/:id/stats', communityController.getStatsPerfil);
router.get('/perfil/:id/seguidores', communityController.getSeguidores);
router.get('/perfil/:id/seguindo', communityController.getSeguindo);

router.get('/timeline', postController.getTimeline);

router.get('/post/:id', postController.getPostById);

router.get('/posts/:usuario_id', postController.getUserPosts);
router.post('/posts', postController.createPost);
router.put('/posts/:id', postController.updatePost);

router.post('/posts/curtir', postController.toggleLike);
router.get('/posts/:post_id/curtidas', postController.getPostLikes);

router.post('/posts/comentar', postController.addComment);
router.get('/posts/:post_id/comentarios', postController.getComments);
router.delete('/posts/comentarios/:id', postController.deleteComment);

module.exports = router;