const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Drop the unique purchase index if it exists, to allow multiple null/undefined values
    try {
      const collections = await mongoose.connection.db.listCollections({ name: 'purchaseinvoices' }).toArray();
      if (collections.length > 0) {
        await mongoose.connection.db.collection('purchaseinvoices').dropIndex('purchase_1');
        logger.info('Dropped unique purchase_1 index on purchaseinvoices collection');
      }
    } catch (indexError) {
      logger.info(`Index drop details (safe to ignore if index does not exist): ${indexError.message}`);
    }
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
