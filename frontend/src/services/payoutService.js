import axiosInstance from '../helper/axiosConfig';
import { handleError } from '../utils/errorHandler';

/**
 * Check if a project is eligible for payouts
 */
export const checkPayoutEligibility = async (projectId) => {
  try {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    
    const response = await axiosInstance.get(`/api/v1/payouts/projects/${projectId}/payout/eligibility`);
    return {
      error: false,
      data: response.data.data
    };
  } catch (error) {
    return handleError(error, 'Failed to check payout eligibility');
  }
};

/**
 * Request a payout for a project
 */
export const requestPayout = async (projectId, amount) => {
  try {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    
    const payload = amount ? { amount } : {};
    const response = await axiosInstance.post(`/api/v1/payouts/projects/${projectId}/payouts`, payload);
    
    return {
      error: false,
      data: response.data.data
    };
  } catch (error) {
    return handleError(error, 'Failed to request payout');
  }
};

/**
 * Get payout history for a project
 */
export const getPayoutHistory = async (projectId, page = 1, perPage = 10) => {
  try {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    
    // Fix the endpoint path to match the backend route
    const response = await axiosInstance.get(`/api/v1/payouts/projects/${projectId}/payouts`, {
      params: { page, per_page: perPage }
    });
    
    return {
      error: false,
      data: response.data.data
    };
  } catch (error) {
    return handleError(error, 'Failed to fetch payout history');
  }
};

/**
 * Connect a bank account via Stripe Connect
 */
export const connectBankAccount = async () => {
  try {
    const response = await axiosInstance.post('/api/v1/bank-accounts/connect-bank-account');
    
    return {
      error: false,
      data: response.data.data
    };
  } catch (error) {
    return handleError(error, 'Failed to initiate bank account connection');
  }
};

/**
 * Check bank account connection status
 */
export const getBankAccountStatus = async () => {
  try {
    const response = await axiosInstance.get('/api/v1/bank-accounts/bank-account-status');
    
    return {
      error: false,
      data: response.data.data
    };
  } catch (error) {
    return handleError(error, 'Failed to get bank account status');
  }
};

export default {
  checkPayoutEligibility,
  requestPayout,
  getPayoutHistory,
  connectBankAccount,
  getBankAccountStatus
};