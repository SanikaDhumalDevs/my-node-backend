const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const entryRoutes = require('./routes/entryRoutes');
const emailRoutes = require('./routes/emailRoutes');
const donationRoutes = require('./routes/donationRoutes');
const donationPlatformRoutes = require("./routes/donationPlatform");
const authRoutes = require('./routes/auth');
const familyRoutes = require('./routes/family');
const dashboardRoutes = require('./routes/dashboard-routes');
const entryByEmailRoutes = require('./routes/entryByEmailRoutes');
const notificationRoutes=require('./routes/notifications');
const streakRoutes = require('./routes/streak');
const medicineInfoRoute = require('./routes/MedicineInfo');
const aiRecipesRoute = require('./routes/aiRecipes');
const manageExpiringProducts=require('./routes/manageExpiringProducts');
const emissionFactorRoutes = require('./routes/emissionFactorRoutes');
const aiSuggestionsRoutes = require('./routes/aiSuggestions');

// near other requires at top
const emissionsRouter = require('./routes/emissionSuggestions'); // adjust path if needed

// after your other app.use(...) calls, mount:

  require('dotenv').config();
require('./cronMailer');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());

app.use(express.json());
app.use('/api',emailRoutes);
app.use('/api/ai-recipes',aiRecipesRoute);
app.use('/api/family',familyRoutes);
app.use('/api/donate',donationRoutes);
app.use("/api/donation-platform", donationPlatformRoutes);
app.use('/api/emission-factor', emissionFactorRoutes);

app.use('/api/entries',entryByEmailRoutes);
app.use('/api/notifications',notificationRoutes);
app.use('/api/manage-expiring-products',manageExpiringProducts);
// Routes
app.use('/api/auth', authRoutes); 
app.use('/api/entries',entryRoutes);
app.use('/api/emissions', emissionsRouter);
app.use('/api/ai', aiSuggestionsRoutes);
app.use('/api',medicineInfoRoute);
app.use('/api',dashboardRoutes);
app.use('/api/streak',streakRoutes);
app.get('/', (req, res) => {
  res.send('SmartWarranty Vault API is running 🚀');
});

// Global error handler (optional)
app.use((err, req, res, next) => {
  console.error("💥 Uncaught Error:", err);
  res.status(500).json({ message: "Internal Server Error", error: err.message });
});

// ✅ Connect to MongoDB and start server
// ✅ Connect to MongoDB and start server
mongoose.connect("mongodb+srv://expense_user:SecurePass123@cluster0.yourcluster.mongodb.net/expense_tracker?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  app.get('/ping', (req, res) => {
  res.send("pong");
});
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});
module.exports = app;