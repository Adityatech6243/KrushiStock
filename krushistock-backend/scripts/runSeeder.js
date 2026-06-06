const mongoose = require('mongoose');
const { seedDatabase } = require('../seeders/dbSeeder');
require('dotenv').config();

// Get MongoDB URI from environment or use local fallback
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/krushistock';

const run = async () => {
  try {
    console.log(`Connecting to MongoDB at: ${MONGO_URI.replace(/:([^@:]+)@/, ':****@')}`);
    
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connection established successfully.');

    // Execute Seeding
    await seedDatabase({ clearExisting: true });

    console.log('Seeder process execution complete.');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during seeder execution:', error);
    process.exit(1);
  } finally {
    // Ensure the mongoose connection is closed
    if (mongoose.connection) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
    }
  }
};

run();
