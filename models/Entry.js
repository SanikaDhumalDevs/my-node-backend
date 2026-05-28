const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  purchaseDate: {
    type: Date
  },
  warrantyPeriod: {
    type: String
  },
  expiryDate: {
    type: Date
  },
  billImage: {
    type: String  // URL or filename
  },
  category: {
    type: String,
    enum: ['product', 'medicine', 'food'], // for tab selection
    required: true
  },
  city: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: ''
  },

  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    enum: ['kg', 'g', 'liter', 'ml', 'packet', 'piece','tablet'],
    required: true
  },
  totalEmission: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'entries' }); // ✅ force correct collection name

module.exports =
  mongoose.models.Entry || mongoose.model('Entry', entrySchema);