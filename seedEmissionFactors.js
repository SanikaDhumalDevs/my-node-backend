const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import your existing Mongoose Model
const EmissionFactor = require('./models/EmissionFactor');

// Expanded dataset with exactly 15 Products, 15 Medicines, and 15 Foods
const seedData = [
  // ==================== 1. HOME PRODUCTS (15 Entries) ====================
  { itemName: "Laptop", category: "product", unit: "piece", emission_factor: 350.0 },
  { itemName: "Smartphone", category: "product", unit: "piece", emission_factor: 70.0 },
  { itemName: "LED Bulb", category: "product", unit: "piece", emission_factor: 15.0 },
  { itemName: "Refrigerator", category: "product", unit: "piece", emission_factor: 850.0 },
  { itemName: "Air Conditioner", category: "product", unit: "piece", emission_factor: 1100.0 },
  { itemName: "Washing Machine", category: "product", unit: "piece", emission_factor: 400.0 },
  { itemName: "Microwave Oven", category: "product", unit: "piece", emission_factor: 150.0 },
  { itemName: "Television", category: "product", unit: "piece", emission_factor: 250.0 },
  { itemName: "Vacuum Cleaner", category: "product", unit: "piece", emission_factor: 80.0 },
  { itemName: "Electric Kettle", category: "product", unit: "piece", emission_factor: 30.0 },
  { itemName: "Table Fan", category: "product", unit: "piece", emission_factor: 45.0 },
  { itemName: "Geyser", category: "product", unit: "piece", emission_factor: 300.0 },
  { itemName: "Toaster", category: "product", unit: "piece", emission_factor: 25.0 },
  { itemName: "Hair Dryer", category: "product", unit: "piece", emission_factor: 20.0 },
  { itemName: "Desktop PC", category: "product", unit: "piece", emission_factor: 500.0 },

  // ==================== 2. MEDICINES (15 Entries) ====================
  { itemName: "Paracetamol", category: "medicine", unit: "tablet", emission_factor: 0.05 },
  { itemName: "Ibuprofen", category: "medicine", unit: "tablet", emission_factor: 0.06 },
  { itemName: "Amoxicillin", category: "medicine", unit: "tablet", emission_factor: 0.08 },
  { itemName: "Aspirin", category: "medicine", unit: "tablet", emission_factor: 0.04 },
  { itemName: "Metformin", category: "medicine", unit: "tablet", emission_factor: 0.05 },
  { itemName: "Atorvastatin", category: "medicine", unit: "tablet", emission_factor: 0.07 },
  { itemName: "Omeprazole", category: "medicine", unit: "tablet", emission_factor: 0.05 },
  { itemName: "Cetirizine", category: "medicine", unit: "tablet", emission_factor: 0.03 },
  { itemName: "Azithromycin", category: "medicine", unit: "tablet", emission_factor: 0.09 },
  { itemName: "Losartan", category: "medicine", unit: "tablet", emission_factor: 0.06 },
  { itemName: "Vitamin C", category: "medicine", unit: "tablet", emission_factor: 0.02 },
  { itemName: "Calcium Tablet", category: "medicine", unit: "tablet", emission_factor: 0.03 },
  { itemName: "Cough Syrup", category: "medicine", unit: "ml", emission_factor: 0.010 },
  { itemName: "Antacid Liquid", category: "medicine", unit: "ml", emission_factor: 0.012 },
  { itemName: "Paracetamol Syrup", category: "medicine", unit: "ml", emission_factor: 0.015 },

  // ==================== 3. PACKET FOODS / FOOD STUFFS (15 Entries) ====================
  { itemName: "Milk", category: "food", unit: "liter", emission_factor: 1.9 },
  { itemName: "Rice", category: "food", unit: "kg", emission_factor: 3.6 },
  { itemName: "Bread", category: "food", unit: "packet", emission_factor: 1.2 },
  { itemName: "Potato Chips", category: "food", unit: "packet", emission_factor: 0.8 },
  { itemName: "Wheat Flour", category: "food", unit: "kg", emission_factor: 1.4 },
  { itemName: "Butter", category: "food", unit: "packet", emission_factor: 2.5 },
  { itemName: "Cheese", category: "food", unit: "kg", emission_factor: 8.5 },
  { itemName: "Chocolate", category: "food", unit: "packet", emission_factor: 1.5 },
  { itemName: "Fruit Juice", category: "food", unit: "liter", emission_factor: 1.1 },
  { itemName: "Eggs", category: "food", unit: "piece", emission_factor: 0.3 },
  { itemName: "Chicken", category: "food", unit: "kg", emission_factor: 6.9 },
  { itemName: "Sugar", category: "food", unit: "kg", emission_factor: 1.6 },
  { itemName: "Instant Noodles", category: "food", unit: "packet", emission_factor: 0.5 },
  { itemName: "Cooking Oil", category: "food", unit: "liter", emission_factor: 2.8 },
  { itemName: "Yogurt", category: "food", unit: "packet", emission_factor: 0.9 }
];

// Connection and seeding function
const seedDatabase = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error("Database connection URI is missing from your .env file.");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("Database connection successful.");

    console.log("Clearing old emission factors from collection...");
    await EmissionFactor.deleteMany({});
    console.log("Collection cleared.");

    console.log("Inserting new emission factors (45 total items)...");
    await EmissionFactor.insertMany(seedData);
    console.log("Data seeding completed successfully.");

  } catch (error) {
    console.error("Seeding failed with error:", error.message);
  } finally {
    console.log("Disconnecting from database...");
    await mongoose.disconnect();
    console.log("Disconnected. Process complete.");
    process.exit(0);
  }
};

// Run Seeder
seedDatabase();