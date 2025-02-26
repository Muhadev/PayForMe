import axios from 'axios';

// Create axios instance with default config similar to projectService
const api = axios.create({
    baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
    withCredentials: true,
    headers: {
        'Accept': 'application/json',
    }
});

// Add request interceptor to add token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
}, (error) => {
    return Promise.reject(error);
});

const AuthService = {
    // Logout the user
    logout: async () => {
        try {
            // Call the backend logout endpoint to revoke the token
            await api.delete('/api/v1/auth/logout');
            
            // Remove tokens from localStorage
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            
            return { success: true, message: 'Logout successful' };
        } catch (error) {
            console.error('Logout error:', error);
            
            // Even if the API call fails, we should still clear local storage
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            
            return { 
                success: false, 
                message: error.response?.data?.msg || 'Error during logout'
            };
        }
    },
};

export default AuthService;