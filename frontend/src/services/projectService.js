// services/projectService.js
import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
    baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
    // Add withCredentials for CORS
    withCredentials: true,
    headers: {
        'Accept': 'application/json', // Fixed typo in 'json'
        // 'Content-Type': 'application/json'
    }
});

// Add request interceptor to add token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    } else {
        console.error('No access token found!');
    }

    // Don't set Content-Type for FormData
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
    }
);

export const createProject = async (formData, isDraft = false) => {
    try {
        const endpoint = `/api/v1/${isDraft ? 'projects/drafts' : 'projects'}`;
        const response = await api.post(endpoint, formData);
        return response.data;
    } catch (error) {
        console.error('Full error details:', {
            status: error.response?.status,
            data: error.response?.data,
            headers: error.response?.headers
        });
        throw error;
    }
};

export const updateDraft = async (draftId, formData) => {
    try {
        const response = await api.put(`/api/v1/projects/drafts/${draftId}`, formData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const fetchDraft = async (draftId) => {
    try {
        const response = await api.get(`/api/v1/projects/drafts/${draftId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const fetchCategories = async () => {
    try {
        const response = await api.get('/api/v1/categories/');
        // Make sure we're returning the data in the correct format
        return response.data.data ? { data: response.data.data } : { data: [] };
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }
};