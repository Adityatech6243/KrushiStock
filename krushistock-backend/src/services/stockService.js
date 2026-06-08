const Stock = require('../models/Stock');

const getStockMap = async (productIds, session = null) => {
  const ids = productIds.filter(Boolean);
  if (ids.length === 0) {
    return new Map();
  }

  const query = Stock.find({ product: { $in: ids } }).select('product quantity batches');
  if (session) {
    query.session(session);
  }

  const stocks = await query;
  return new Map(stocks.map((stock) => [
    stock.product.toString(),
    {
      quantity: stock.quantity,
      batches: stock.batches || []
    }
  ]));
};

const getStockQuantity = async (productId, session = null) => {
  const query = Stock.findOne({ product: productId }).select('quantity');
  if (session) {
    query.session(session);
  }

  const stock = await query;
  return stock?.quantity || 0;
};

module.exports = {
  getStockMap,
  getStockQuantity
};
