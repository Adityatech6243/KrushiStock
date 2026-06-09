const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/krushistock';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin User';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const createAdminUser = async () => {
  try {
    if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
      console.log('Skipping admin user creation: ADMIN_PASSWORD environment variable is not set or is less than 8 characters.');
      process.exit(0);
    }

    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected');

    const existingAdmin = await User.findOne({ username: ADMIN_USERNAME });
    
    if (existingAdmin) {
      console.log('Admin user already exists!');
      process.exit(0);
    }

    await User.create({
      name: ADMIN_NAME,
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin'
    });

    console.log('Admin user created successfully!');
    console.log(`Username: ${ADMIN_USERNAME}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createAdminUser();
