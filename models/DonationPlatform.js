const mongoose = require("mongoose");

const donationPlatformSchema = new mongoose.Schema({
  donorName: String,
  email: String,
  contact: String,
  address: String,
  city:{type:String,required:true},
  pinCode: String,
  itemName: String,
  quantity: Number,
  foodType: String,
  expiryDate: Date,
  specialNote: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("DonationPlatform", donationPlatformSchema);