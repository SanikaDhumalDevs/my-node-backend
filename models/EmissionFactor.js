const mongoose = require('mongoose');

const emissionFactorSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['food', 'medicine', 'product'],
    required: true
  },
  unit: {
    type: String,
    enum: ['kg', 'g', 'liter', 'litre', 'ml', 'packet', 'piece','tablet'],
    required: true
  },
  emission_factor: {
    type: Number,
    required: true
  },
  itemName: {
    type: String,
    required: true
  }
}, { collection: 'emission_factors' }); // ✅ force correct collection name

module.exports =
  mongoose.models.EmissionFactor ||
  mongoose.model('EmissionFactor', emissionFactorSchema);