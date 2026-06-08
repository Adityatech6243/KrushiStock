export const validateRequired = (value, customMsg) => {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return customMsg || 'This field is required';
  }
  return '';
};

export const validatePhone = (phone, customMsg) => {
  if (!phone || (typeof phone === 'string' && phone.trim() === '')) {
    return customMsg || 'Phone number is required';
  }
  const regex = /^[6789]\d{9}$/;
  if (!regex.test(phone)) {
    return 'Mobile number must be exactly 10 digits and start with 6, 7, 8, or 9';
  }
  return '';
};

export const validatePositiveNumber = (num, customMsg, required = true) => {
  if (num === '' || num === null || num === undefined) {
    return required ? (customMsg || 'This field is required') : '';
  }
  const parsed = Number(num);
  if (isNaN(parsed)) {
    return 'Please enter a valid number';
  }
  if (parsed < 0) {
    return 'Value cannot be negative';
  }
  return '';
};

export const validateEmail = (email, customMsg, required = false) => {
  if (!email || (typeof email === 'string' && email.trim() === '')) {
    return required ? (customMsg || 'Email address is required') : '';
  }
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    return 'Please enter a valid email address (e.g. name@example.com)';
  }
  return '';
};

export const validateUsername = (username, customMsg) => {
  if (!username || (typeof username === 'string' && username.trim() === '')) {
    return customMsg || 'Username is required';
  }
  if (username.length < 3) {
    return 'Username must be at least 3 characters long';
  }
  const regex = /^[a-zA-Z0-9_]+$/;
  if (!regex.test(username)) {
    return 'Username can only contain alphanumeric characters and underscores';
  }
  return '';
};

export const validatePassword = (password, customMsg, isEditing = false) => {
  if (!password) {
    return isEditing ? '' : (customMsg || 'Password is required');
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters long for security';
  }
  return '';
};

export const validateGst = (gst, customMsg) => {
  if (!gst || (typeof gst === 'string' && gst.trim() === '')) {
    return '';
  }
  const regex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;
  if (!regex.test(gst)) {
    return customMsg || 'Please enter a valid 15-character GSTIN format (e.g. 27AAAAA1111A1Z1)';
  }
  return '';
};

export const validateDateRange = (startDate, endDate, customMsg) => {
  if (!startDate || !endDate) return '';
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end <= start) {
    return customMsg || 'Expiry date must be after manufacture date';
  }
  return '';
};

