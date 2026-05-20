const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/krushistock';

const createAdminUser = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected');

    const User = mongoose.model('User', new mongoose.Schema({
      name: String,
      username: { type: String, unique: true },
      email: String,
      password: String,
      phone: String,
      role: String,
      createdAt: { type: Date, default: Date.now }
    }));

    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists!');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin@123', salt);

    const admin = await User.create({
      name: 'Admin User',
      username: 'admin',
      email: 'adityapatil4703@gmail.com',
      password: hashedPassword,
      phone: '7820974939',
      role: 'admin'
    });

    console.log('Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: Admin@123');
    console.log('\nPlease change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createAdminUser();
