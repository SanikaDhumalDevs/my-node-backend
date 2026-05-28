const express = require("express");
const router = express.Router();
const Entry = require("../models/Entry");

// GET /api/manage-expiring-products?email=...
router.get("/", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Current date
    const now = new Date();

    // 8 days from now (start)
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + 8);
    startDate.setHours(0, 0, 0, 0);

    // 20 days from now (end)
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 20);
    endDate.setHours(23, 59, 59, 999);

    // Fetch entries that:
    // - belong to this email
    // - are food, medicine, or product
    // - have expiryDate between startDate and endDate
    const expiringItems = await Entry.find({
      email: email,
      category: { $in: ["food", "medicine", "product"] },
      expiryDate: { $gte: startDate, $lte: endDate }
    }).sort({ expiryDate: 1 });

    res.json({ entries: expiringItems });
  } catch (err) {
    console.error("Error fetching expiring products:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;