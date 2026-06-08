export const formatDate = (date) => {
  if (!date) return '';
  try {
    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = parseInt(month, 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${parseInt(day, 10)} ${monthNames[monthIndex]} ${year}`;
      }
    }
  } catch (err) {
    console.error('Error formatting date:', err);
  }
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateForInput = (date) => {
  if (!date) return '';
  try {
    return typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
  } catch (err) {
    return '';
  }
};

export const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

export const formatNumber = (num) => {
  return new Intl.NumberFormat('en-IN').format(num || 0);
};

export const calculateTotal = (items, priceKey = 'price', qtyKey = 'quantity') => {
  return items.reduce((sum, item) => sum + (item[priceKey] * item[qtyKey]), 0);
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^[0-9]{10}$/;
  return re.test(phone);
};

export const exportToCSV = (data, filename, headers) => {
  if (!data || !data.length) return;
  
  // Convert headers to CSV line
  const csvHeaders = headers.map(h => `"${h.label}"`).join(',');
  
  // Convert rows to CSV lines
  const csvRows = data.map(row => {
    return headers.map(h => {
      let val = '';
      if (typeof h.key === 'function') {
        val = h.key(row);
      } else {
        val = row[h.key];
      }
      
      const stringVal = val !== undefined && val !== null ? String(val) : '';
      const escaped = stringVal.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });
  
  const csvContent = [csvHeaders, ...csvRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
