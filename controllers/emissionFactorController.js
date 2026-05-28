const EmissionFactor = require('../models/EmissionFactor');

// @desc   Calculate emission factor for given item
// @route  GET /api/emission-factor/calculate
// @access Public
const calculateEmissionFactor = async (req, res) => {
  try {
    let { itemName, quantity, unit } = req.query;

    if (!itemName || !quantity || !unit) {
      return res.status(400).json({ message: "itemName, quantity and unit are required" });
    }

    // Normalize inputs
    itemName = itemName.trim();
    unit = unit.toLowerCase();

    // Create a flexible list of units to search (supports both liter and litre spellings)
    const targetUnits = [unit];
    if (unit === "liter" || unit === "litre") {
      targetUnits.push("liter", "litre");
    }

    // Search DB in emission_factors collection
    // (Uses case-insensitive regex matching and flexible unit synonyms)
    const factor = await EmissionFactor.findOne({
      itemName: { $regex: new RegExp(`^${itemName}$`, "i") }, 
      unit: { $in: targetUnits } 
    });

    if (!factor) {
      return res.status(404).json({ message: `Emission factor not found for ${itemName} (${unit})` });
    }

    // Calculate emission
    const totalEmission = factor.emission_factor * parseFloat(quantity);

    return res.json({
      itemName: factor.itemName,
      unit: factor.unit,
      perUnit: factor.emission_factor,
      quantity: parseFloat(quantity),
      totalEmission
    });
  } catch (err) {
    console.error("Error in emission calculation:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { calculateEmissionFactor };