const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  accountType: { type: String, enum: ['individual', 'family'], required: true },
  createdAt: { type: Date, default: Date.now },
  admin: { type: Boolean, default: false },
  familyAccountName: { type: String },
  members: [ // 🔥 ADD THIS
    {
      name: String,
      email: String,
      password: String,
      createdAt: { type: Date, default: Date.now },
      admin: { type: Boolean, default: false }
    }
  ]
});

module.exports = mongoose.model('User', userSchema);