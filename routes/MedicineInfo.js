const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
require("dotenv").config();

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/medicine-info
router.post("/medicine-info", async (req, res) => {
  try {
    const { medicineName } = req.body;
    if (!medicineName) 
      return res.status(400).json({ error: "Medicine name is required" });

    const prompt = `Provide concise, easy-to-read information about the medicine "${medicineName}" in short bullet points. 
                    Include:
                    - What it is / Uses
                    - Dosage
                    - Side Effects
                    - Precautions
                    Keep each point brief and simple for easy understanding.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or "gpt-3.5-turbo"
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
    });

    const info = response.choices[0].message.content;

    res.json({ info });
  } catch (error) {
    console.error("Error fetching medicine info:", error.message);
    res.status(500).json({ error: "Failed to fetch medicine info. Please try again." });
  }
});

module.exports = router;