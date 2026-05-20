export const validatePhone = (phone) => {
  if (!phone) return 'Phone number is required';
  const regex = /^[6789]\d{9}$/;
  if (!regex.test(phone)) return 'Mobile number must be 10 digits and start with 6, 7, 8, or 9';
  return '';
};

export const validatePositiveNumber = (num, fieldName = 'Value', required = true) => {
  if (num === '' || num === null || num === undefined) {
    return required ? `${fieldName} is required` : '';
  }
  const parsed = Number(num);
  if (isNaN(parsed)) return `${fieldName} must be a valid number`;
  if (parsed < 0) return `${fieldName} cannot be negative`;
  return '';
};
