import { handleError } from '../utils/errorHandler';
import axiosInstance from '../helper/axiosConfig';

/**
 * Fetch backer statistics for a project
 */
export const fetchBackerStats = async (projectId) => {
  try {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    
    // Updated to match the working endpoint from Postman
    const response = await axiosInstance.get(`/api/v1/backers/projects/${projectId}/public-stats`);
    return {
      error: false,
      data: response.data.data || {}
    };
  } catch (error) {
    return handleError(error, 'Failed to fetch backer statistics');
  }
};

/**
 * Get details of a specific donation
 */
export const getDonationDetails = async (donationId) => {
  try {
    if (!donationId) {
      throw new Error('Donation ID is required');
    }
    
    const response = await axiosInstance.get(`/api/v1/backers/donations/${donationId}`);
    return {
      error: false,
      data: response.data.data || {}
    };
  } catch (error) {
    return handleError(error, 'Failed to fetch donation details');
  }
};

/**
 * Get rewards available for a project
 */
export const getAvailableRewards = async (projectId) => {
  try {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    
    const response = await axiosInstance.get(`/api/v1/rewards/projects/${projectId}/rewards`);
    
    // Process the rewards to add availability information
    const rewards = response.data.data.map(reward => {
      const claimed = reward.quantity_claimed || 0;
      const available = reward.quantity_available || 0;
      
      return {
        ...reward,
        remaining: available - claimed,
        is_available: (available - claimed) > 0
      };
    });
    
    return {
      error: false,
      data: {
        rewards: rewards,
        available_rewards: rewards.filter(r => r.is_available)
      }
    };
  } catch (error) {
    return handleError(error, 'Failed to fetch project rewards');
  }
};

export default {
  fetchBackerStats,
  getDonationDetails,
  getAvailableRewards
};