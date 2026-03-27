const express = require('express');
const router = express.Router();
const { createRoom, getRoom, joinRoom, closeRoom, updateScore } = require('../controllers/roomsController');

router.post('/', createRoom);
router.get('/:roomId', getRoom);
router.post('/:roomId/join', joinRoom);
router.post('/:roomId/close', closeRoom);
router.post('/:roomId/score', updateScore);

module.exports = router;
