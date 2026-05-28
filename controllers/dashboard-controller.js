const Entry = require('../models/Entry');


// GET /api/dashboard?email=user@example.com
const getDashboardData = async (req, res) => {
  const { email } = req.query;
  console.log("Fetching dashboard for email:", email);

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email query param is required' });
    }

    const productCount = await Entry.countDocuments({ email, category: 'product' });
    const medicineCount = await Entry.countDocuments({ email, category: 'medicine' });
    const foodCount = await Entry.countDocuments({ email, category: 'food' });

    const entries = await Entry.find({ email }).sort({ createdAt: -1 });

    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    const expiringSoonCount = await Entry.countDocuments({
      email,
      expiryDate: { $gte: today, $lte: threeDaysFromNow }
    });

    res.json({
      productCount,
      medicineCount,
      foodCount,
      expiringSoonCount,
      entries
    });
  } catch (error) {
    console.error("Error in getDashboardData:", error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
};


module.exports={getDashboardData};
