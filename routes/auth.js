const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/User");

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, accountType, familyAccountName, admin } = req.body;

    if (!name || !email || !password || !accountType) {
      return res.status(400).json({ message: "All required fields must be filled." });
    }

    const normalizedType = accountType.trim().toLowerCase();
    if (normalizedType !== "individual" && normalizedType !== "family") {
      return res.status(400).json({ message: "Invalid account type." });
    }

    if (normalizedType === "family" && !familyAccountName) {
      return res.status(400).json({ message: "Family account name is required for family accounts." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      accountType: normalizedType,
      familyAccountName: normalizedType === "family" ? familyAccountName : null,
      admin: normalizedType === "family" ? admin || false : false
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully." });

  } catch (error) {
    console.error("Registration Error:", error.message);
    res.status(500).json({ message: "Server error during registration.", error: error.message });
  }
});

// POST /api/auth/check-family
router.post("/check-family", async (req, res) => {
  try {
    const { familyAccountName } = req.body;

    if (!familyAccountName || familyAccountName.trim() === "") {
      return res.status(400).json({ message: "Family account name is required." });
    }

    const existing = await User.findOne({
      familyAccountName: { $regex: new RegExp(`^${familyAccountName}$`, "i") }
    });

    if (existing) {
      return res.status(409).json({ message: "Family name already taken." });
    }

    return res.status(200).json({ message: "Family name is available." });

  } catch (error) {
    console.error("Check Family Error:", error.message);
    res.status(500).json({ message: "Server error during family check.", error: error.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password, accountType } = req.body;

    if (!email || !password || !accountType) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User does not exist." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password." });
    }

    const storedType = user.accountType?.trim().toLowerCase();
    const incomingType = accountType.trim().toLowerCase();

    if (storedType !== incomingType) {
      return res.status(400).json({
        message: `You are registered as a ${user.accountType} user, not ${accountType}.`
      });
    }

    res.status(200).json({
      message: "Login successful.",
      user: {
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        admin: user.admin,
        familyAccountName: user.familyAccountName || null
      }
    });

  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ message: "Server error during login.", error: error.message });
  }
});

module.exports = router;