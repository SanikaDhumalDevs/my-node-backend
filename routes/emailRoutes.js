const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// ✅ Import the correct model path only once
const Entry = require('../models/Entry'); // Make sure Entry.js exports the model only once
// POST /api/email/notify-expiry
router.post('/notify-expiry', async (req, res) => {
  const { to } = req.body;
  // ✅ Check if email address is provided
  if (!to) {
    return res.status(400).json({ success: false, error: 'No recipient email provided.' });
  }

  try {
    // Get current date and 3 days ahead
    const currentDate = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(currentDate.getDate() + 3);

    const expiringItems = await Entry.find({
        email:to,
      expiryDate: {
        $gte: currentDate,
        $lte: threeDaysLater,
      },
    });

    if (expiringItems.length === 0) {
      return res.json({ success: true, message: 'No items expiring in next 3 days.' });
    }

    // Format email content
    const itemList = expiringItems
      .map((item, index) => `${index + 1}. ${item.itemName} (Expires: ${new Date(item.expiryDate).toLocaleDateString()})`)
      .join('\n');

    const emailText = `The following items are expiring in the next 3 days:\n\n${itemList}`;

    // Setup nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // ✅ Set this in .env
        pass: process.env.EMAIL_PASS, // ✅ Set this in .env
      },
    });

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: 'Items Expiring Soon - Notification',
      text: emailText,
    };

    const info = await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'Expiry notification email sent!', info });
  } catch (error) {
    console.error('❌ Error sending expiry email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;