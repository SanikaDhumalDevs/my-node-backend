const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Entry = require('../models/Entry');

router.get('/:familyAccountName', async (req, res) => {
  try {
    const familyAccountName = req.params.familyAccountName;

    if (!familyAccountName) {
      return res.status(400).json({ message: 'familyAccountName is required' });
    }

    // Find the admin user for the family
    const adminUser = await User.findOne({ familyAccountName, admin: true });
    if (!adminUser) {
      return res.status(404).json({ message: 'Family admin not found' });
    }

    // Get all member emails + admin email
    const memberEmails = (adminUser.members || []).map(m => m.email.toLowerCase());
    memberEmails.push(adminUser.email.toLowerCase()); // include admin

    // Calculate date range: today to 3 days later
    const today = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(today.getDate() + 3);

    // Find entries where email in memberEmails and expiryDate is within next 3 days
    const expiringEntries = await Entry.find({
      email: { $in: memberEmails },
      expiryDate: { $gte: today, $lte: threeDaysLater }
    });

    // Format notification data
    const notifications = expiringEntries.map(entry => ({
      email: entry.email,
      productName: entry.itemName || 'Unnamed Product',
      expiryDate: entry.expiryDate
    }));

    return res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;