const Entry = require('../models/Entry');

// Fetch streak data for a user
exports.getStreak = async (req, res) => {
  try {
    const { email } = req.params;
    const entries = await Entry.find({ email }).sort({ createdAt: 1 });
    const gapAllowed = 5;

    if (entries.length === 0) {
      return res.json({
        currentStreak: 0,
        gapDaysLeft: gapAllowed,
        streakHistory: [],
      });
    }

    let currentStreak = 0;
    let lastActiveDate = null;
    let streakHistory = [];

    const activityDates = entries.map(e => {
      const d = new Date(e.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });

    for (let i = 0; i < activityDates.length; i++) {
      const date = activityDates[i];

      if (lastActiveDate === null) {
        currentStreak = 1;
        streakHistory.push({ date: new Date(date), status: 'active' });
      } else {
        const diffDays = (date - lastActiveDate) / (1000 * 60 * 60 * 24);

        if (diffDays === 0) continue; // same day, skip
        else if (diffDays === 1 || diffDays <= gapAllowed) {
          currentStreak++;
          streakHistory.push({ date: new Date(date), status: 'active' });
        } else {
          currentStreak = 1; // streak broken
          streakHistory.push({ date: new Date(date), status: 'broken' });
        }
      }

      lastActiveDate = date;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffFromLast = Math.floor((today.getTime() - lastActiveDate) / (1000 * 60 * 60 * 24));
    const gapDaysLeft = gapAllowed - diffFromLast;

    res.json({
      currentStreak,
      gapDaysLeft: gapDaysLeft > 0 ? gapDaysLeft : 0,
      streakHistory,
    });
  } catch (error) {
    console.error('Error fetching streak:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Reset streak for a user
exports.resetStreak = async (req, res) => {
  try {
    const { email } = req.body; // ✅ FIXED: get email from body
    if (!email) {
      return res.status(400).json({ message: "Email is required to reset streak" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // create a fresh entry marking reset
    const newEntry = new Entry({
      email,
      productName: 'First product of new streak',
      createdAt: today,
    });

    await newEntry.save();

    res.json({
      message: 'Streak reset successfully. New streak started today.',
      currentStreak: 1,
      gapDaysLeft: 5,
    });
  } catch (err) {
    console.error('Error resetting streak:', err);
    res.status(500).json({ message: 'Server error', err });
  }
};