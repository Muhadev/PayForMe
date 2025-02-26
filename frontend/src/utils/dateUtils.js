// utils/dateUtils.js

/**
 * Formats a date to show how long ago it occurred (e.g., "5 minutes ago", "2 hours ago")
 * 
 * @param {string|Date} dateString - The date to format
 * @returns {string} A user-friendly string representing how long ago the date occurred
 */
export const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (isNaN(diffInSeconds)) {
      return 'Invalid date';
    }
    
    // Less than a minute
    if (diffInSeconds < 60) {
      return 'just now';
    }
    
    // Less than an hour
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    // Less than a day
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    // Less than a week
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
    
    // Less than a month
    if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    }
    
    // Format as a regular date if older than a month
    return date.toLocaleDateString();
  };
  
  /**
   * Formats a date range in a user-friendly way
   * 
   * @param {string|Date} startDate - The start date
   * @param {string|Date} endDate - The end date
   * @returns {string} A formatted date range string
   */
  export const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'Invalid date range';
    }
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, options)}`;
  };
  
  /**
   * Formats a date to show the day of week and date
   * 
   * @param {string|Date} dateString - The date to format
   * @returns {string} A formatted date string (e.g., "Monday, Jan 1, 2023")
   */
  export const formatFriendlyDate = (dateString) => {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };