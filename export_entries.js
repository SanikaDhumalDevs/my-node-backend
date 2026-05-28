const mongoose = require('mongoose');
const fs = require('fs');
const Entry = require('./models/Entry'); // adjust if your model path is different

// 1. Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/expense_tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  exportData();
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// 2. Function to export data
async function exportData() {
  try {
    const entries = await Entry.find(); // get all documents
    fs.writeFileSync('entries.json', JSON.stringify(entries, null, 2));
    console.log('Data exported to entries.json');
    process.exit();
  } catch (error) {
    console.error('Error exporting data:', error);
    process.exit(1);
  }
}