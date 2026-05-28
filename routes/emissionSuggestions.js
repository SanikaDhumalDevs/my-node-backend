// routes/emissionSuggestions.js
const express = require('express');
const router = express.Router();
const Entry = require('../models/Entry'); // adjust path if your models folder differs

// helper: nice month label like "Sep 2025"
function monthLabel(year, month) {
  const d = new Date(year, month, 1);
  return d.toLocaleString('default', { month: 'short', year: 'numeric' });
}

/**
 * GET /api/emissions/summary?email=user@example.com
 * Returns a structured summary (no OpenAI yet)
 */
router.get('/summary', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ error: 'email query param required' });

    // Fetch entries for user
    const entries = await Entry.find({ email }).lean();

    // If no entries, return empty summary
    if (!entries || entries.length === 0) {
      return res.json({
        summary: {
          currentMonthTotal: 0,
          previousMonthTotal: 0,
          history: [],
          topEmitters: []
        },
        message: 'No entries found for this user.'
      });
    }

    // Group totals by year-month using purchaseDate (fallback to createdAt)
    const grouped = {}; // key: "YYYY-M" -> { year, month, total, items[] }

    entries.forEach((e) => {
      const dateSource = e.purchaseDate ? new Date(e.purchaseDate) : new Date(e.createdAt);
      if (!dateSource || isNaN(dateSource.getTime())) return;

      const y = dateSource.getFullYear();
      const m = dateSource.getMonth();
      const key = `${y}-${m}`;

      if (!grouped[key]) grouped[key] = { year: y, month: m, total: 0, items: [] };

      const emissionVal = Number(e.totalEmission || 0);
      grouped[key].total += emissionVal;

      // keep item-level info for top-emitter detection
      grouped[key].items.push({
        itemName: e.itemName || 'Unknown',
        category: e.category || 'unknown',
        emission: emissionVal
      });
    });

    // Convert grouped into sorted history array
    const historyArray = Object.values(grouped)
      .map((obj) => ({
        year: obj.year,
        month: obj.month,
        monthLabel: monthLabel(obj.year, obj.month),
        total: Number(obj.total.toFixed(2)),
        items: obj.items
      }))
      .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));

    // Determine current and previous month totals based on server date
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${now.getMonth()}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prev.getFullYear()}-${prev.getMonth()}`;

    const currentObj = grouped[currentKey] || { total: 0, items: [] };
    const previousObj = grouped[prevKey] || { total: 0, items: [] };

    // Identify top emitters in current month (aggregate by itemName)
    const topMap = {};
    (currentObj.items || []).forEach((it) => {
      const name = it.itemName || 'Unknown';
      topMap[name] = (topMap[name] || 0) + Number(it.emission || 0);
    });

    const topEmitters = Object.keys(topMap)
      .map((name) => ({ itemName: name, emission: Number(topMap[name].toFixed(2)) }))
      .sort((a, b) => b.emission - a.emission)
      .slice(0, 6); // top 6

    const summary = {
      currentMonthTotal: Number(currentObj.total.toFixed(2)),
      previousMonthTotal: Number(previousObj.total.toFixed(2)),
      history: historyArray,
      topEmitters
    };

    return res.json({ summary });
  } catch (err) {
    console.error('Error /api/emissions/summary:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;