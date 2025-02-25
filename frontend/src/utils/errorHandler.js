// utils/errorHandler.js
import { toast } from 'react-toastify';

/**
 * Handle API errors consistently across the application
 * @param {Error} error - The error object
 * @param {string} defaultMessage - Default error message
 * @returns {Object} Standardized error response object
 */
export const handleError = (error, defaultMessage = 'An error occurred') => {
  console.error('API Error:', error);
  
  // Extract error message from API response if available
  let errorMessage = defaultMessage;
  let statusCode = 500;
  
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    statusCode = error.response.status;
    
    if (error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    } else if (error.response.data && error.response.data.error) {
      errorMessage = error.response.data.error;
    }
  } else if (error.request) {
    // The request was made but no response was received
    errorMessage = 'No response received from server. Please check your internet connection.';
  } else if (error.message) {
    // Something happened in setting up the request that triggered an Error
    errorMessage = error.message;
  }
  
  return {
    error: true,
    statusCode,
    errorMessage
  };
};


/**
 * Format validation errors from API responses
 * 
 * @param {Object} errors - Validation errors object from API
 * @returns {Object} Formatted errors object for form display
 */
export const formatValidationErrors = (errors) => {
  if (!errors) return {};
  
  // Convert API error format to form error format
  const formattedErrors = {};
  
  Object.keys(errors).forEach(field => {
    formattedErrors[field] = errors[field].join(', ');
  });
  
  return formattedErrors;
};

export default {
  handleError,
  formatValidationErrors
};