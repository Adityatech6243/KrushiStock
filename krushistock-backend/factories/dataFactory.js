const { faker } = require('@faker-js/faker');

// Helper to determine season from month index (0-11)
const getSeasonFromMonth = (monthIndex) => {
  if (monthIndex >= 5 && monthIndex <= 8) {
    return 'Monsoon';
  } else if (monthIndex >= 9 || monthIndex === 0) {
    return 'Winter';
  } else {
    return 'Summer';
  }
};

// Generates a random date within a specific month and year
const getRandomDateInMonth = (year, monthIndex) => {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Map products to their seasonal relevance keywords
const getSeasonallyRelevantProducts = (products, monthIndex) => {
  const season = getSeasonFromMonth(monthIndex);
  
  return products.filter(product => {
    const desc = (product.description || '').toLowerCase();
    const name = (product.name || '').toLowerCase();
    
    if (season === 'Monsoon') {
      // In Monsoon (sowing/spraying), seeds like rice/paddy, cotton, soybean and weedicides/fertilizers are in high demand
      return name.includes('paddy') || name.includes('rice') || name.includes('cotton') || 
             name.includes('soybean') || name.includes('sugarcane') || name.includes('urea') || 
             name.includes('dap') || name.includes('weedicide') || name.includes('fungicide') ||
             name.includes('sprayer') || desc.includes('monsoon');
    } else if (season === 'Winter') {
      // In Winter, wheat seeds, Slow-release NPK, lime, and fungicides for rust are in high demand
      return name.includes('wheat') || name.includes('npk') || name.includes('dap') || 
             name.includes('fungicide') || name.includes('lime') || name.includes('tomato') || 
             name.includes('chilli') || desc.includes('winter');
    } else {
      // In Summer, potash, soil conditioners (gypsum), organic compost, tools, and neem oil are popular
      return name.includes('potash') || name.includes('gypsum') || name.includes('neem') || 
             name.includes('hoe') || name.includes('sickle') || name.includes('chilli') || 
             name.includes('tomato') || desc.includes('summer');
    }
  });
};

/**
 * Generate purchases for a specific supplier and month
 */
const generatePurchase = (purchaseIndex, supplier, supplierProducts, date) => {
  const itemsCount = Math.floor(Math.random() * 2) + 1; // 1-2 items per purchase
  const items = [];
  let totalAmount = 0;
  
  // Shuffle products to pick random ones
  const shuffled = [...supplierProducts].sort(() => 0.5 - Math.random());
  const selectedProducts = shuffled.slice(0, Math.min(itemsCount, shuffled.length));
  
  selectedProducts.forEach(product => {
    // Large bulk quantities for purchases
    let quantity = 50;
    if (product.unit === 'piece' && product.name.includes('Buds')) {
      quantity = 2000; // Sugarcane buds are purchased in bulk thousands
    } else if (product.unit === 'piece') {
      quantity = 20; // Hand tools
    } else if (product.unit === 'litre') {
      quantity = 40; // Litres of chemicals
    } else {
      quantity = 100; // Bags of fertilizer/seeds
    }
    
    // Add randomness to quantity
    quantity = Math.round(quantity * (0.8 + Math.random() * 0.4));
    
    items.push({
      product: product._id,
      quantity,
      price: product.purchasePrice
    });
    
    totalAmount += quantity * product.purchasePrice;
  });
  
  const paymentMethods = ['Cash', 'UPI', 'Bank Transfer'];
  const paymentStatuses = ['Paid', 'Pending', 'Partial'];
  
  // High likelihood of Paid or Partial, lower for Pending
  const paymentStatus = paymentStatuses[Math.random() < 0.7 ? 0 : (Math.random() < 0.7 ? 2 : 1)];
  
  return {
    purchaseNumber: `PUR-${String(purchaseIndex).padStart(4, '0')}`,
    supplier: supplier._id,
    items,
    totalAmount,
    purchaseDate: date,
    paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
    paymentStatus,
    createdAt: date
  };
};

/**
 * Generate sales for a specific farmer and month
 */
const generateSale = (saleIndex, farmer, products, date) => {
  const monthIndex = date.getMonth();
  const season = getSeasonFromMonth(monthIndex);
  
  // Get products matching the farmer's crops/soil or the current season
  const relevantProducts = getSeasonallyRelevantProducts(products, monthIndex);
  
  // Fallback to all products if none matched
  const pool = relevantProducts.length > 0 ? relevantProducts : products;
  
  // Filter pool further based on farmer cropTypes if possible, to make it highly personalized
  let personalizedPool = pool.filter(p => {
    if (!farmer.cropTypes || farmer.cropTypes.length === 0) return true;
    return farmer.cropTypes.some(crop => p.keywords && p.keywords.includes(crop));
  });
  if (personalizedPool.length === 0) {
    personalizedPool = pool;
  }
  
  const itemsCount = Math.floor(Math.random() * 2) + 1; // 1-2 items per sale
  const items = [];
  let totalAmount = 0;
  
  const shuffled = [...personalizedPool].sort(() => 0.5 - Math.random());
  const selectedProducts = shuffled.slice(0, Math.min(itemsCount, shuffled.length));
  
  selectedProducts.forEach(product => {
    // Retail quantities for sales
    let quantity = 2;
    if (product.unit === 'piece' && product.name.includes('Buds')) {
      quantity = 200; // Sugarcane buds
    } else if (product.unit === 'piece') {
      quantity = 1; // Hand tools
    } else if (product.unit === 'litre') {
      quantity = 2; // Litres of chemicals
    } else {
      quantity = 5; // Bags of fertilizer/seeds
    }
    
    // Add randomness to quantity
    quantity = Math.round(quantity * (0.6 + Math.random() * 0.8));
    if (quantity < 1) quantity = 1;
    
    items.push({
      product: product._id,
      quantity,
      price: product.sellingPrice
    });
    
    totalAmount += quantity * product.sellingPrice;
  });
  
  const paymentMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer'];
  
  // Crop type associated with sale: usually the main crop of the farmer
  let cropType = 'Other';
  if (farmer.cropTypes && farmer.cropTypes.length > 0) {
    cropType = farmer.cropTypes[Math.floor(Math.random() * farmer.cropTypes.length)];
  }
  
  return {
    saleNumber: `SAL-${String(saleIndex).padStart(4, '0')}`,
    customer: farmer._id,
    farmerId: farmer._id,
    cropType,
    season,
    items,
    totalAmount,
    saleDate: date,
    paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
    createdAt: date
  };
};

/**
 * Generate secondary records: Invoices, Reminders, Notifications, WhatsApp logs
 */
const generateInvoiceHistory = (sale, customer) => {
  const statuses = ['Sent', 'Sent', 'Pending', 'Failed'];
  const sentStatus = statuses[Math.floor(Math.random() * statuses.length)];
  
  return {
    sale: sale._id,
    customer: customer._id,
    pdfPath: `uploads/invoices/${sale.saleNumber}.pdf`,
    mediaId: sentStatus === 'Sent' ? `media_${Math.random().toString(36).substring(2, 12)}` : null,
    sentStatus,
    sentAt: sentStatus === 'Sent' ? new Date(sale.saleDate.getTime() + 600000) : null, // 10 minutes later
    errorMessage: sentStatus === 'Failed' ? 'WhatsApp API rate limit exceeded or invalid phone number' : null,
    createdAt: sale.saleDate
  };
};

const generateReminder = (sale, customer) => {
  // Reminders only for sales with amount > 2000
  const dueDate = new Date(sale.saleDate);
  dueDate.setDate(dueDate.getDate() + 30); // 30 days due date
  
  const isPaid = Math.random() > 0.4;
  
  return {
    type: 'payment_due',
    customer: customer._id,
    sale: sale._id,
    amountDue: sale.totalAmount,
    dueDate,
    paymentStatus: isPaid ? 'Paid' : 'Pending',
    lastReminderSent: !isPaid && Math.random() > 0.5 ? new Date(sale.saleDate.getTime() + 15 * 86400000) : null,
    reminderCount: !isPaid ? Math.floor(Math.random() * 3) : 0,
    isActive: !isPaid,
    createdAt: sale.saleDate,
    updatedAt: isPaid ? dueDate : new Date(sale.saleDate.getTime() + 15 * 86400000)
  };
};

const generateNotificationLog = (type, recipient, referenceId, referenceModel, message, isSuccess, timestamp) => {
  return {
    type,
    recipient,
    referenceId,
    referenceModel,
    message,
    status: isSuccess ? 'success' : 'failed',
    error: isSuccess ? null : 'Failed to send WhatsApp push notification',
    timestamp
  };
};

const generateWhatsAppMessage = (phone, type, messageType, content, status, timestamp) => {
  const wamid = `wamid.HBgMOTE5ODc2NTQzMjEwFQIAERg5REFDMThEMzk3ODhGMjE4QkQACgA=`;
  const uniqueWamid = wamid.replace('919876543210', phone) + Math.random().toString(36).substring(2, 8);
  
  return {
    whatsappMessageId: uniqueWamid,
    type,
    from: type === 'sent' ? 'System' : phone,
    to: type === 'sent' ? phone : 'System',
    messageType,
    content,
    status,
    statusHistory: [
      { status: 'sent', timestamp: new Date(timestamp.getTime() - 2000) },
      { status, timestamp }
    ],
    timestamp
  };
};

module.exports = {
  getSeasonFromMonth,
  getRandomDateInMonth,
  generatePurchase,
  generateSale,
  generateInvoiceHistory,
  generateReminder,
  generateNotificationLog,
  generateWhatsAppMessage
};
