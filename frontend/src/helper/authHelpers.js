// src/helpers/authHelpers.js
import axiosInstance from './axiosConfig';

export const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await axiosInstance.post('/api/v1/auth/refresh', { refresh_token: refreshToken });
    if (response.status === 200) {
      localStorage.setItem('accessToken', response.data.access_token);
      return response.data.access_token;
    }
  } catch (error) {
    console.error('Failed to refresh access token:', error.response?.data?.msg || error.message);
    return null;
  }
};
