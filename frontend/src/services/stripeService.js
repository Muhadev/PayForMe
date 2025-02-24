// services/stripeService.js
import axiosInstance from '../helper/axiosConfig';

export const backProject = async (projectId, amount, rewardId = null) => {
  try {
    const response = await axiosInstance.post(`/api/v1/backers/projects/${projectId}/back`, {
      amount,
      reward_id: rewardId
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};