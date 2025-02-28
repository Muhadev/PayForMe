// src/helpers/authHelpers.js
import axios from 'axios';

const baseURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return null;
    }
    
    // Use a new axios instance to avoid circular dependency
    const response = await axios.post(`${baseURL}/api/v1/auth/refresh`, {}, {
      headers: {
        'Authorization': `Bearer ${refreshToken}`
      }
    });
    
    if (response.status === 200) {
      return response.data.access_token;
    }
    return null;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return null;
  }
};