const express = require("express");
const router = express.Router();
const axios = require("axios");
require("dotenv").config();

router.post("/", async (req, res) => {
  const { itemName } = req.body;

  if (!itemName) {
    return res.status(400).json({ error: "Item name is required" });
  }

  try {
    const prompt = `You are a helpful recipe assistant. Suggest 4 recipes using "${itemName}". 
Return strictly valid JSON in this format:

[
  {
    "name": "Recipe Name",
    "ingredients": ["ingredient1", "ingredient2"],
    "cookingTime": "XX minutes",
    "procedure": ["Step 1", "Step 2", "Step 3"]
  }
]

Make sure each recipe has cookingTime, ingredients, and procedure as arrays. Do not include extra text outside the JSON.`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful recipe assistant." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const recipeText = response.data.choices[0].message.content.trim();

    // Attempt to fix any JSON issues
    let recipesArray = [];
    try {
      // Remove any text before first '[' and after last ']'
      const firstBracket = recipeText.indexOf("[");
      const lastBracket = recipeText.lastIndexOf("]");
      const jsonString = firstBracket !== -1 && lastBracket !== -1
        ? recipeText.slice(firstBracket, lastBracket + 1)
        : recipeText;

      const parsed = JSON.parse(jsonString);

      recipesArray = parsed.map((r, i) => ({
        name: r.name || `${itemName} Recipe ${i + 1}`,
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [r.ingredients || "Not available"],
        cookingTime: r.cookingTime || "Not available",
        procedure: Array.isArray(r.procedure) ? r.procedure : [r.procedure || "Not available"],
      }));
    } catch (err) {
      console.error("JSON parse error:", err);
      // Fallback: 4 empty recipes
      recipesArray = Array.from({ length: 4 }, (_, i) => ({
        name: `${itemName} Recipe ${i + 1}`,
        ingredients: ["Not available"],
        cookingTime: "Not available",
        procedure: ["Not available"],
      }));
    }

    // Ensure we always have exactly 4 recipes
    while (recipesArray.length < 4) {
      recipesArray.push({
        name: `${itemName} Recipe ${recipesArray.length + 1}`,
        ingredients: ["Not available"],
        cookingTime: "Not available",
        procedure: ["Not available"],
      });
    }

    res.json({ recipes: recipesArray });
  } catch (err) {
    console.error("Error fetching AI recipes:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
});

module.exports = router;