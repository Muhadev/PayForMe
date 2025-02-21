/**
 * Format a number as currency with specified options
 * 
 * @param {number} amount - The amount to format
 * @param {Object} options - Formatting options
 * @param {string} options.currency - Currency code (default: 'USD')
 * @param {string} options.locale - Locale for formatting (default: 'en-US')
 * @param {boolean} options.showSymbol - Whether to show currency symbol (default: true)
 * @param {number} options.decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (
    amount,
    { 
      currency = 'USD', 
      locale = 'en-US',
      showSymbol = true,
      decimals = 2
    } = {}
  ) => {
    // Handle complex objects that might be passed accidentally
    if (amount === null || amount === undefined || typeof amount === 'object') {
      return showSymbol ? '$0.00' : '0.00';
    }
  
    try {
      const numericAmount = Number(amount);
      if (isNaN(numericAmount)) {
        return showSymbol ? '$0.00' : '0.00';
      }
      
      const formatter = new Intl.NumberFormat(locale, {
        style: showSymbol ? 'currency' : 'decimal',
        currency: showSymbol ? currency : undefined,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      
      return formatter.format(numericAmount);
    } catch (error) {
      console.error('Error formatting currency:', error);
      // Fallback formatting
      const numericAmount = Number(amount) || 0;
      return showSymbol 
        ? `$${numericAmount.toFixed(decimals)}`
        : numericAmount.toFixed(decimals);
    }
  };
/**
 * Format a number as USD currency
 * 
 * @param {number} amount - The amount to format
 * @returns {string} Formatted USD currency string
 */
export const formatUSD = (amount) => {
  return formatCurrency(amount, { currency: 'USD' });
};

/**
 * Format a number without currency symbol
 * 
 * @param {number} amount - The amount to format
 * @returns {string} Formatted number with decimal places
 */
export const formatNumeric = (amount) => {
  return formatCurrency(amount, { showSymbol: false });
};

export const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'TBA';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

// Usage example:
// formatDate('2024-12-25') -> "December 25, 2024"
// fo