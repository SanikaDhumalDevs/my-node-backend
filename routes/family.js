// routes/family.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Escape regex for safe case-insensitive search
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ✅ GET /api/family/:email
router.get('/:email', async (req, res) => {
  try {
    const rawEmail = req.params.email || '';
    const email = rawEmail.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const regex = new RegExp('^' + escapeRegExp(email) + '$', 'i');

    // 1️⃣ Try to find as ADMIN user first
    let user = await User.findOne({ email: { $regex: regex } });
    if (user) {
      return res.json({
        familyAccountName: user.familyAccountName || '',
        members: (user.members || []).map(m => ({
          name: m.name || '',
          email: m.email || ''
        })),
        isAdmin: !!user.admin,
        adminEmail:user.email,
        adminName:user.name
      });
    }

    // 2️⃣ Try to find as MEMBER in an admin's members array
    const adminUser = await User.findOne({
      admin: true,
      "members.email": { $regex: regex }
    });

    if (adminUser) {
      return res.json({
        familyAccountName: adminUser.familyAccountName || '',
        members: (adminUser.members || []).map(m => ({
          name: m.name || '',
          email: m.email || ''
        })),
        isAdmin: false
      });
    }

    // 3️⃣ Not found
    return res.status(404).json({ message: 'User not found in any family' });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ POST /api/family/add-members
router.post('/add-members', async (req, res) => {
  try {
    const { familyAccountName, members } = req.body;

    if (!familyAccountName || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: 'familyAccountName and members[] required' });
    }

    const adminUser = await User.findOne({ familyAccountName, admin: true });
    if (!adminUser) {
      return res.status(403).json({ message: 'Admin not found for this family' });
    }

    const existing = new Set(
      (adminUser.members || []).map(m => (m.email || '').toLowerCase())
    );

    const newMembers = [];
    members.forEach(memberEmail => {
      const email = String(memberEmail).trim().toLowerCase();
      if (email && !existing.has(email)) {
        adminUser.members.push({
          name: '',
          email,
          password: '',
          admin: false,
          createdAt: new Date()
        });
        newMembers.push({ name: '', email });
        existing.add(email);
      }
    });

    await adminUser.save();
    res.status(201).json(newMembers);

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// Add this DELETE route at the end of your routes/family.js file, before module.exports

// ✅ DELETE /api/family/delete-member
router.delete('/delete-member', async (req, res) => {
  try {
    console.log('Delete member API called');
    console.log('Request body:', req.body);

    const { familyAccountName, memberEmail } = req.body;

    if (!familyAccountName || !memberEmail) {
      return res.status(400).json({ message: 'familyAccountName and memberEmail required' });
    }

    const adminUser = await User.findOne({ familyAccountName, admin: true });
    if (!adminUser) {
      return res.status(403).json({ message: 'Admin not found for this family' });
    }

    const memberEmailLower = memberEmail.toLowerCase();
    const initialCount = adminUser.members.length;
    adminUser.members = adminUser.members.filter(
      m => (m.email || '').toLowerCase() !== memberEmailLower
    );

    if (adminUser.members.length === initialCount) {
      return res.status(404).json({ message: 'Member email not found' });
    }

    await adminUser.save();
    return res.json({ message: 'Member deleted successfully' });

  } catch (err) {
    console.error('Error in delete-member route:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;