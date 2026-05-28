const express = require("express");
const router = express.Router();
const DonationPlatform = require("../models/DonationPlatform");

// Add new donation entry
router.post("/add", async (req, res) => {
  try {
    const { expiryDate, city } = req.body;

    // City validation
    if (!city || city.trim().toLowerCase() !== "satara") {
      return res.status(400).json({ message: "Donations are only accepted from Satara." });
    }

    const today = new Date();
    const diff = (new Date(expiryDate) - today) / (1000 * 60 * 60 * 24);

    if (diff < 15) {
      return res.status(400).json({ message: "Expiry date must be at least 15 days ahead" });
    }

    const donation = new DonationPlatform(req.body);
    await donation.save();
    res.status(201).json({ message: "Donation saved successfully", donation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all entries (for testimonials/admin)
router.get("/", async (req, res) => {
  try {
    const donations = await DonationPlatform.find().sort({ createdAt: -1 });
    res.json(donations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;