const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/krushistock';

const run = async () => {
  await mongoose.connect(MONGO_URI);

  const products = mongoose.connection.collection('products');
  const stocks = mongoose.connection.collection('stocks');
  const legacyProducts = await products.find(
    {},
    { projection: { quantity: 1, reorderLevel: 1 } }
  ).toArray();

  if (legacyProducts.length > 0) {
    await stocks.bulkWrite(
      legacyProducts.map((product) => ({
        updateOne: {
          filter: { product: product._id },
          update: {
            $setOnInsert: {
              product: product._id,
              quantity: Number(product.quantity) || 0,
              lowStockLimit: product.reorderLevel ?? 10,
              lastUpdated: new Date()
            }
          },
          upsert: true
        }
      }))
    );
  }

  const result = await products.updateMany(
    { quantity: { $exists: true } },
    { $unset: { quantity: '' } }
  );

  console.log(`Ensured Stock records for ${legacyProducts.length} products.`);
  console.log(`Removed legacy quantity from ${result.modifiedCount} products.`);
};

run()
  .catch((error) => {
    console.error('Stock source migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
