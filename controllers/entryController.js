const Entry = require('../models/Entry');
const User = require('../models/User');
const { spawn } = require('child_process');
const path = require('path');
// Helper to call Python prediction script (city & country optional)
function runPythonPrediction(itemName, category, city = '', country = '') {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../ai/predict_expiry.py');
    const args = [scriptPath, itemName, category];

    if (city) args.push(city);
    if (country) args.push(country);

    const pyProcess = spawn('python', args);

    let output = '';
    let errorOutput = '';

    pyProcess.stdout.on('data', (data) => { output += data.toString(); });
    pyProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

    pyProcess.on('close', (code) => {
      if (code !== 0) return reject(new Error(errorOutput || `Python exited with code ${code}`));
      try {
        const result = JSON.parse(output.trim());
        resolve(result);
      } catch (err) {
        reject(new Error(`Invalid JSON from Python: ${output}`));
      }
    });
  });
}

// Helper functions (parseWarrantyToDays, median, toDate, adjustForClimate) remain the same
function parseWarrantyToDays(text) {
  if (!text) return null;
  const s = text.toLowerCase();
  const numMatch = s.match(/\d+/);
  if (!numMatch) return null;
  const num = parseInt(numMatch[0], 10);
  if (s.includes("year") || s.includes("yr")) return num * 365;
  if (s.includes("month") || s.includes("mo")) return num * 30;
  if (s.includes("week")) return num * 7;
  if (s.includes("day")) return num;
  return num <= 24 ? num * 30 : num;
}

function median(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return sorted[mid];
}

function toDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
}

function adjustForClimate(expiryDays, climateFactor = 1) {
  const adjustedDays = Math.round(expiryDays * climateFactor);
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + adjustedDays);
  return expiryDate.toISOString();
}

const addEntry = async (req, res) => {
  try {
    // ✅ Match frontend field names
    const { 
      email, 
      itemName, 
      category, 
      purchaseDate, 
      warrantyPeriod, 
      expiryDate, 
      city, 
      country, 
      quantity, 
      unit, 
      totalEmission 
    } = req.body;

    if (!itemName || !category) {
      return res.status(400).json({ error: "Item name and category are required" });
    }

    // ✅ Check user
    let existingUser = await User.findOne({ email });
    if (!existingUser) {
      existingUser = await User.findOne({ 'members.email': email });
      if (!existingUser) return res.status(404).json({ error: 'User not found' });
    }

    // ✅ Prepare entry data
    const entryData = { 
      email, 
      itemName, 
      category, 
      billImage: req.file ? req.file.filename : null,
      city: city || null,
      country: country || null,
      quantity: quantity || 1,
      unit: unit || 'unit',
      totalEmission: totalEmission || 0
    };

    const purchaseDateObj = toDate(purchaseDate);

    // ---- Product logic ----
    if (category === 'product') {
      entryData.purchaseDate = purchaseDate;
      entryData.warrantyPeriod = warrantyPeriod;

      if (!warrantyPeriod || warrantyPeriod.trim() === "") {
        let pastEntries = await Entry.find({ category: 'product', itemName, warrantyPeriod: { $exists: true, $ne: null, $ne: "" } });
        if (!pastEntries.length) pastEntries = await Entry.find({ category: 'product', warrantyPeriod: { $exists: true, $ne: null, $ne: "" } });

        const warrantyDaysList = pastEntries.map(e => parseWarrantyToDays(e.warrantyPeriod)).filter(d => d != null);
        const medianWarrantyDays = median(warrantyDaysList);

        if (medianWarrantyDays && purchaseDateObj) {
          const medianMonths = Math.round(medianWarrantyDays / 30);
          entryData.warrantyPeriod = medianMonths > 1 ? `${medianMonths} months` : `${medianMonths} month`;
        } else {
          try {
            const aiResult = await runPythonPrediction(itemName, category, city, country);
            if (aiResult && aiResult.warranty_period) entryData.warrantyPeriod = aiResult.warranty_period;
          } catch (err) {
            console.error("AI warranty prediction failed:", err.message);
          }
        }
      }
    }

    // ---- Medicine/Food logic ----
    else if (category === 'medicine' || category === 'food') {
      entryData.purchaseDate = purchaseDate;
      entryData.expiryDate = expiryDate;

      if (!expiryDate || expiryDate.trim() === "") {
        if (!purchaseDateObj) return res.status(400).json({ error: "Purchase date required to predict expiry date" });

        let pastEntries = await Entry.find({ category, itemName, purchaseDate: { $ne: null }, expiryDate: { $ne: null } });
        if (!pastEntries.length) pastEntries = await Entry.find({ category, purchaseDate: { $ne: null }, expiryDate: { $ne: null } });

        const expiryDurations = pastEntries.map(e => {
          const pd = toDate(e.purchaseDate);
          const ed = toDate(e.expiryDate);
          if (pd && ed) return Math.floor((ed.getTime() - pd.getTime()) / (1000 * 3600 * 24));
          return null;
        }).filter(d => d != null && d > 0);

        const medianExpiryDays = median(expiryDurations);

        if (medianExpiryDays) {
          if (category === 'food') entryData.expiryDate = adjustForClimate(medianExpiryDays, 1.1);
          else entryData.expiryDate = new Date(purchaseDateObj.getTime() + medianExpiryDays * 24 * 3600 * 1000).toISOString();
        } else {
          try {
            const aiResult = await runPythonPrediction(itemName, category, city, country);
            if (aiResult && aiResult.expiry_date) entryData.expiryDate = aiResult.expiry_date;
          } catch (err) {
            console.error("AI expiry prediction failed:", err.message);
          }
        }
      }
    }

    // ✅ Save entry
    const newEntry = new Entry(entryData);
    await newEntry.save();
    res.status(201).json({ message: 'Entry saved successfully', entry: newEntry });

  } catch (err) {
    console.error("addEntry Error:", err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

const deleteExpiredEntries = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    let existingUser = await User.findOne({ email });
    if (!existingUser) existingUser = await User.findOne({ 'members.email': email });
    if (!existingUser) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    const result = await Entry.deleteMany({ email, expiryDate: { $lt: now } });
    res.status(200).json({ message: `Deleted ${result.deletedCount} expired entries.`, deletedCount: result.deletedCount });

  } catch (err) {
    console.error("deleteExpiredEntries Error:", err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

module.exports = { addEntry, deleteExpiredEntries };