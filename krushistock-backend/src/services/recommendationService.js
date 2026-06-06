const Farmer = require('../models/Farmer');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Category = require('../models/Category');

const cropRules = {
  sugarcane: ['potash', 'urea', 'sugarcane', 'nitrogen', 'phosphate', 'fertilizer', 'monsoon'],
  cotton: ['cotton', 'seed', 'insecticide', 'magnesium', 'sulfate', 'imidacloprid', 'chlorpyrifos'],
  rice: ['rice', 'paddy', 'zinc', 'urea', 'npk', 'pesticide', 'monsoon'],
  paddy: ['rice', 'paddy', 'zinc', 'urea', 'npk', 'pesticide', 'monsoon'],
  wheat: ['wheat', 'seed', 'npk', 'dap', 'fungicide', 'rust', 'winter'],
  soybean: ['soybean', 'rhizobium', 'dap', 'weedicide'],
  maize: ['maize', 'corn', 'npk', 'atrazine', 'seed'],
  corn: ['maize', 'corn', 'npk', 'atrazine', 'seed'],
  vegetable: ['compost', 'neem', 'oil', 'fungicide', 'micronutrient'],
  tomato: ['compost', 'neem', 'oil', 'fungicide', 'micronutrient', 'tomato'],
  chilli: ['compost', 'neem', 'oil', 'fungicide', 'micronutrient', 'chilli']
};

const soilRules = {
  Black: ['cotton', 'sulphur', 'drainage', 'potash', 'phosphorus'],
  Red: ['dap', 'urea', 'lime', 'calcium', 'phosphate'],
  Alluvial: ['urea', 'dap', 'npk', 'nitrogen'],
  Sandy: ['organic', 'manure', 'compost', 'slow-release', 'nitrogen'],
  Loamy: ['npk', 'compost', 'general', 'micronutrient'],
  Clayey: ['gypsum', 'compost', 'soil amendment', 'conditioner'],
  Laterite: ['lime', 'phosphate', 'potash', 'acidic']
};

const seasonRules = {
  Monsoon: ['fungicide', 'monsoon', 'rain', 'paddy', 'rice', 'weedicide'],
  Winter: ['winter', 'wheat', 'gram', 'mustard', 'slow-release', 'potash'],
  Summer: ['summer', 'sunflower', 'moong', 'compost', 'conditioner', 'heat', 'irrigation']
};

const getSeasonFromDate = (date) => {
  const d = date ? new Date(date) : new Date();
  const month = d.getMonth();
  if (month >= 5 && month <= 8) {
    return 'Monsoon';
  } else if (month >= 9 || month === 0) {
    return 'Winter';
  } else {
    return 'Summer';
  }
};

const productMatchesKeywords = (product, keywords) => {
  if (!keywords || !keywords.length) return false;
  const name = (product.name || '').toLowerCase();
  const description = (product.description || '').toLowerCase();
  const categoryName = (product.category && product.category.name || '').toLowerCase();

  return keywords.some(keyword => {
    const kw = keyword.toLowerCase();
    return name.includes(kw) || description.includes(kw) || categoryName.includes(kw);
  });
};

const getFarmerRecommendations = async (farmerId) => {
  const farmer = await Farmer.findOne({ _id: farmerId, deletedAt: null });
  if (!farmer) {
    throw new Error('Farmer not found');
  }

  const currentSeason = getSeasonFromDate(new Date());
  
  // Fetch active products
  const products = await Product.find({ isActive: true, deletedAt: null }).populate('category');

  // Collaborative filtering: find products bought by other farmers in the same village
  const villageProductIdsSet = new Set();
  if (farmer.village) {
    const villageFarmers = await Farmer.find({ 
      village: farmer.village, 
      _id: { $ne: farmer._id }, 
      deletedAt: null 
    }).select('_id');
    const villageFarmerIds = villageFarmers.map(f => f._id);
    
    if (villageFarmerIds.length > 0) {
      const villageSales = await Sale.find({ 
        customer: { $in: villageFarmerIds } 
      }).select('items.product');
      
      for (const sale of villageSales) {
        for (const item of sale.items) {
          if (item.product) {
            villageProductIdsSet.add(item.product.toString());
          }
        }
      }
    }
  }

  const recommendations = [];

  for (const product of products) {
    let score = 0;
    const reasons = [];
    const breakdown = {
      cropScore: 0,
      seasonScore: 0,
      soilScore: 0,
      purchaseScore: 0,
      collaborativeScore: 0
    };

    // 1. Crop Match (30%)
    let isCropMatch = false;
    if (farmer.cropTypes && farmer.cropTypes.length > 0) {
      for (const crop of farmer.cropTypes) {
        const normalizedCrop = crop.toLowerCase();
        // Check if crop name is directly in product name/desc/category
        const directMatch = productMatchesKeywords(product, [normalizedCrop]);
        // Or if product matches crop specific rules
        const ruleKeywords = cropRules[normalizedCrop] || [];
        const ruleMatch = productMatchesKeywords(product, ruleKeywords);
        
        if (directMatch || ruleMatch) {
          isCropMatch = true;
          reasons.push(`Highly recommended for your ${crop} crop.`);
          break;
        }
      }
    }
    if (isCropMatch) {
      score += 30;
      breakdown.cropScore = 30;
    }

    // 2. Season Match (25%)
    const seasonKeywords = seasonRules[currentSeason] || [];
    if (productMatchesKeywords(product, seasonKeywords) || productMatchesKeywords(product, [currentSeason])) {
      score += 25;
      breakdown.seasonScore = 25;
      reasons.push(`Matches the current ${currentSeason} season requirements.`);
    }

    // 3. Soil Match (20%)
    if (farmer.soilType) {
      const soilKeywords = soilRules[farmer.soilType] || [];
      if (productMatchesKeywords(product, soilKeywords) || productMatchesKeywords(product, [farmer.soilType])) {
        score += 20;
        breakdown.soilScore = 20;
        reasons.push(`Suitable for ${farmer.soilType} soil type.`);
      }
    }

    // 4. Previous Purchase Match (15%)
    let hasPurchased = false;
    if (farmer.purchaseHistory && farmer.purchaseHistory.length > 0) {
      hasPurchased = farmer.purchaseHistory.some(id => id.toString() === product._id.toString());
    }
    if (!hasPurchased && farmer.preferredProducts && farmer.preferredProducts.length > 0) {
      hasPurchased = farmer.preferredProducts.some(id => id.toString() === product._id.toString());
    }
    if (hasPurchased) {
      score += 15;
      breakdown.purchaseScore = 15;
      reasons.push(`You have previously purchased this product.`);
    }

    // 5. Collaborative Match (10%)
    if (villageProductIdsSet.has(product._id.toString())) {
      score += 10;
      breakdown.collaborativeScore = 10;
      reasons.push(`Trending in your village (${farmer.village}) among other farmers.`);
    }

    if (score > 0) {
      recommendations.push({
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          sellingPrice: product.sellingPrice,
          unit: product.unit,
          quantity: product.quantity,
          category: product.category,
          description: product.description,
          stockStatus: product.stockStatus
        },
        confidenceScore: score,
        reasons,
        breakdown
      });
    }
  }

  // Sort by confidenceScore descending
  recommendations.sort((a, b) => b.confidenceScore - a.confidenceScore);

  return recommendations;
};

const getTrendingRecommendations = async () => {
  // Aggregate sales to find top-selling products
  const trendingProducts = await Sale.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        totalQuantity: { $sum: '$items.quantity' },
        totalSales: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
        transactionCount: { $sum: 1 }
      }
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: 10 }
  ]);

  // Populate product details
  const populatedTrending = await Promise.all(
    trendingProducts.map(async (item) => {
      const product = await Product.findOne({ _id: item._id, deletedAt: null }).populate('category');
      if (!product) return null;
      return {
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          sellingPrice: product.sellingPrice,
          unit: product.unit,
          quantity: product.quantity,
          category: product.category
        },
        totalQuantity: item.totalQuantity,
        totalSales: item.totalSales,
        transactionCount: item.transactionCount
      };
    })
  );

  // Group trends by village
  const villageTrends = await Sale.aggregate([
    {
      $lookup: {
        from: 'farmers',
        localField: 'customer',
        foreignField: '_id',
        as: 'farmer'
      }
    },
    { $unwind: '$farmer' },
    { $unwind: '$items' },
    {
      $group: {
        _id: { village: '$farmer.village', product: '$items.product' },
        totalQuantity: { $sum: '$items.quantity' }
      }
    },
    { $sort: { '_id.village': 1, totalQuantity: -1 } }
  ]);

  const populatedVillageTrends = await Promise.all(
    villageTrends.map(async (trend) => {
      const product = await Product.findOne({ _id: trend._id.product, deletedAt: null }).populate('category');
      if (!product) return null;
      return {
        village: trend._id.village,
        product: {
          _id: product._id,
          name: product.name,
          category: product.category
        },
        totalQuantity: trend.totalQuantity
      };
    })
  );

  return {
    topProducts: populatedTrending.filter(Boolean),
    villageTrends: populatedVillageTrends.filter(Boolean)
  };
};

const getSeasonalRecommendations = async (season) => {
  const currentSeason = season || getSeasonFromDate(new Date());
  const seasonKeywords = seasonRules[currentSeason] || [];
  
  const products = await Product.find({ isActive: true, deletedAt: null }).populate('category');
  const seasonalProducts = [];

  for (const product of products) {
    let matches = false;
    let confidenceScore = 0;
    const reasons = [];

    if (productMatchesKeywords(product, seasonKeywords) || productMatchesKeywords(product, [currentSeason])) {
      matches = true;
      confidenceScore = 75;
      reasons.push(`Perfect fit for the ${currentSeason} season requirements.`);
    }

    if (matches) {
      seasonalProducts.push({
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          sellingPrice: product.sellingPrice,
          unit: product.unit,
          quantity: product.quantity,
          category: product.category,
          description: product.description,
          stockStatus: product.stockStatus
        },
        confidenceScore,
        reasons,
        season: currentSeason
      });
    }
  }

  seasonalProducts.sort((a, b) => b.confidenceScore - a.confidenceScore);
  return seasonalProducts;
};

const getCropRecommendations = async (cropName) => {
  if (!cropName) return [];
  const normalizedCropName = cropName.toLowerCase();
  const ruleKeywords = cropRules[normalizedCropName] || [];
  
  const products = await Product.find({ isActive: true, deletedAt: null }).populate('category');
  const cropProducts = [];

  for (const product of products) {
    let matches = false;
    let confidenceScore = 0;
    const reasons = [];

    const directMatch = productMatchesKeywords(product, [normalizedCropName]);
    const ruleMatch = productMatchesKeywords(product, ruleKeywords);

    if (directMatch) {
      matches = true;
      confidenceScore = 90;
      reasons.push(`Directly matches ${cropName} cultivation inputs.`);
    } else if (ruleMatch) {
      matches = true;
      confidenceScore = 70;
      reasons.push(`Commonly used for ${cropName} cultivation.`);
    }

    if (matches) {
      cropProducts.push({
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          sellingPrice: product.sellingPrice,
          unit: product.unit,
          quantity: product.quantity,
          category: product.category,
          description: product.description,
          stockStatus: product.stockStatus
        },
        confidenceScore,
        reasons,
        crop: cropName
      });
    }
  }

  cropProducts.sort((a, b) => b.confidenceScore - a.confidenceScore);
  return cropProducts;
};

module.exports = {
  getFarmerRecommendations,
  getTrendingRecommendations,
  getSeasonalRecommendations,
  getCropRecommendations,
  getSeasonFromDate
};
