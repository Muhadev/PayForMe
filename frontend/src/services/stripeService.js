// services/stripeService.js
import axiosInstance from '../helper/axiosConfig';

export const backProject = async (projectId, amount, rewardId = null) => {
  try {
    const payload = {
      amount: amount,
      currency: 'USD'
    };
    
    if (rewardId) {
      payload.reward_id = rewardId;
    }
    
    const response = await axiosInstance.post(`/api/v1/backers/projects/${projectId}/back`, payload);
    return response.data;
  } catch (error) {
    console.error('Error backing project:', error);
    throw error;
  }
};

export const getBackerStats = async (projectId) => {
  try {
    const response = await axiosInstance.get(`/api/v1/backers/projects/${projectId}/backers/stats`);
    return response.data;
  } catch (error) {
    console.error('Error fetching backer stats:', error);
    throw error;
  }
};