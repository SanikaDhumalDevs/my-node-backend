const express = require('express');
const router = express.Router();
const streakController = require('../controllers/streakController');

// Get streak info for user by email
router.get('/:email', streakController.getStreak);

// Update streak on product add
router.post('/reset', streakController.resetStreak);

module.exports = router;