const express = require('express');
const router = express.Router();
const { createDeposit } = require('../controllers/depositController');

router.post('/', createDeposit);

module.exports = router;
