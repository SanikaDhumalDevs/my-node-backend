const express = require('express');
const router = express.Router();
const {calculateEmissionFactor} = require('../controllers/emissionFactorController');

// ✅ Changed to POST to match frontend request
router.get('/calculate',calculateEmissionFactor );

module.exports = router;