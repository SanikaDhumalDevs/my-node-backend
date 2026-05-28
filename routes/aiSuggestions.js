// routes/aiSuggestions.js
const express = require('express');
const OpenAI = require('openai');
const Entry = require('../models/Entry'); // Your Entry model

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper: build summary for current month only, including category, only with totalEmission > 0
async function buildSummary(email) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const entries = await Entry.find({ 
    email, 
    totalEmission: { $gt: 0 }, 
    purchaseDate: { $gte: startOfMonth } 
  });

  const summary = {};

  entries.forEach((entry) => {
    const cat = entry.category || 'unknown';
    if (!summary[cat]) {
      summary[cat] = { total: 0, items: [] };
    }

    summary[cat].total += entry.totalEmission;
    summary[cat].items.push({
      itemName: entry.itemName,
      emission: entry.totalEmission,
      quantity: entry.quantity,
      unit: entry.unit,
    });
  });

  return summary;
}

// Route: GET /api/ai/suggestions?email=xxx
router.get('/suggestions', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const summary = await buildSummary(email);

    // If no data, return an empty array so frontend doesn't crash
    if (Object.keys(summary).length === 0) {
      return res.json({ suggestions: [] }); 
    }

    // UPDATED PROMPT: Requesting structured JSON Array
    const prompt = `
    Analyze this carbon footprint data:
    ${JSON.stringify(summary)}

    Identify the specific items causing emissions.
    Return a strictly valid JSON array of objects. 
    Do NOT include markdown formatting (like \`\`\`json). Just raw JSON.
    
    Each object in the array must have these exact keys:
    - "item": (Name of the item)
    - "causes": (Short explanation of why it causes emissions)
    - "effects": (Environmental impact)
    - "tips": (Array of strings: actionable tips to reduce)
    - "replacements": (Array of strings: sustainable alternatives)

    Only include items present in the data.
    `;

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    let suggestionsData = [];
    try {
      const content = response.choices[0].message.content;
      // Clean up if OpenAI adds markdown backticks
      const cleanJson = content.replace(/```json|```/g, '').trim();
      suggestionsData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("AI JSON Parse Error", parseError);
      suggestionsData = []; 
    }

    res.json({ suggestions: suggestionsData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI suggestions failed' });
  }
});

module.exports = router;