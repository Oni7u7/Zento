const express = require('express');
const router = express.Router();
const { getOnboarding } = require('../controllers/onboardingController');

router.get('/:userId', getOnboarding);

module.exports = router;
