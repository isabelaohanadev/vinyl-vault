const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

router.put('/:id', userController.updateProfile);
router.delete('/:id', userController.deleteAccount);
router.put('/:id/status', userController.updateStatus);

module.exports = router;