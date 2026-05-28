const express = require('express');
const router = express.Router();
const Entry = require('../models/Entry');

router.get('/by-email/:email', async (req, res) => {
  const email = req.params.email;
  try {
    const entries = await Entry.find({ email });
    res.json({ entries });
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ message: 'Server error fetching entries' });
  }
});

module.exports = router;