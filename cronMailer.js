const cron = require("node-cron");
const mongoose = require("mongoose");
const Entry = require("./models/Entry");
const nodemailer = require("nodemailer");
require("dotenv").config(); // Load EMAIL_USER & EMAIL_PASS from .env



// Function to send email to users with items expiring in 3 days
const sendExpiryNotifications = async () => {
  try {
    const today = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(today.getDate() + 3);

    const expiringEntries = await Entry.find({
      expiryDate: {
        $gte: today,
        $lte: threeDaysLater,
      },
    });

    // Group entries by email
    const userMap = {};
    expiringEntries.forEach((entry) => {
      if (!userMap[entry.email]) userMap[entry.email] = [];
      userMap[entry.email].push(entry);
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    for (const [email, items] of Object.entries(userMap)) {
      const itemList = items
        .map((item, i) => `${i + 1}. ${item.itemName} (Expires: ${new Date(item.expiryDate).toLocaleDateString()})`)
        .join("\n");

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Items Expiring Soon - Notification",
        text: `The following items are expiring in the next 3 days:\n\n${itemList}`,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Sent expiry email to ${email}`);
    }
  } catch (err) {
    console.error("❌ Error sending expiry notifications:", err.message);
  }
};

// Schedule: Every day at 9:00 AM
cron.schedule("0 9 * * *", () => {
  console.log("🕘 Running daily expiry email check...");
  sendExpiryNotifications();
});