// services/projectService.js
import axios from 'axios';
import { AppWindowMacIcon } from 'lucide-react';

// Create axios instance with default config
export const api = axios.create({
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

// Add this to your api interceptor in projectService.js
api.interceptors.response.use(
    (response) => {
      // Transform image_url in the response to include full API path
      if (response.data && response.data.data) {
        const transformData = (item) => {
          if (item.image_url && !item.image_url.startsWith('http')) {
            item.image_url = `${process.env.REACT_APP_BACKEND_URL}/api/v1/projects${item.image_url}`;
          }
          return item;
        };
  
        if (Array.isArray(response.data.data)) {
          response.data.data = response.data.data.map(transformData);
        } else if (response.data.data.projects) {
          response.data.data.projects = response.data.data.projects.map(transformData);
        }
      }
      return response;
    },
    (error) => {
      return Promise.reject(error);
    }
  );



export const createProject = async (formData, isDraft = false) => {
    try {
        const endpoint = isDraft ? '/api/v1/projects/drafts' : '/api/v1/projects';
        
        // Ensure dates are in the correct format

        // Format dates to YYYY-MM-DD
        if (formData instanceof FormData) {
            const startDate = formData.get('start_date');
            const endDate = formData.get('end_date');
            
            if (startDate) {
                const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
                formData.set('start_date', formattedStartDate);
            }
            if (endDate) {
                const formattedEndDate = new Date(endDate).toISOString().split('T')[0];
                formData.set('end_date', formattedEndDate);
            }

            // Convert boolean values
            if (formData.has('featured')) {
                formData.set('featured', formData.get('featured') === 'true');
            }

            // Convert numeric values
            if (formData.has('goal_amount')) {
                formData.set('goal_amount', parseFloat(formData.get('goal_amount')));
            }
            if (formData.has('category_id')) {
                formData.set('category_id', parseInt(formData.get('category_id')));
            }
        }

        // Log the exact data being sent
        if (formData instanceof FormData) {
            console.log('Sending form data:');
            for (let pair of formData.entries()) {
                console.log(`${pair[0]}: ${pair[1]}`);
            }
        }

        const response = await api.post(endpoint, formData);
        return response.data;
    } catch (error) {
        console.error('Project creation error:', {
            status: error.response?.status,
            data: error.response?.data,
            errorMessage: error.response?.data?.message,
            validationErrors: error.response?.data?.errors,
            message: error.message
        });
        // Rethrow with more details
        throw new Error(error.response?.data?.message || error.message);
    }
};

export const getProjectStatus = (project) => {
    if (!project) return 'unknown';
    return project.status?.toLowerCase() || 'unknown';
  };

export const updateDraft = async (draftId, formData) => {
    try {
        const response = await api.put(`/api/v1/projects/drafts/${draftId}`, formData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const fetchProjectForEdit = async (projectId) => {
  try {
      const response = await api.get(`/api/v1/projects/${projectId}`);
      return response.data;
  } catch (error) {
      console.error('Error fetching project for edit:', error);
      throw error;
  }
};

export const updateProject = async (projectId, formData) => {
  try {
      // Format dates for update
      if (formData instanceof FormData) {
          const startDate = formData.get('start_date');
          const endDate = formData.get('end_date');
          
          if (startDate) {
              const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
              formData.set('start_date', formattedStartDate);
          }
          if (endDate) {
              const formattedEndDate = new Date(endDate).toISOString().split('T')[0];
              formData.set('end_date', formattedEndDate);
          }

          // Convert boolean values
          if (formData.has('featured')) {
              formData.set('featured', formData.get('featured') === 'true');
          }

          // Convert numeric values
          if (formData.has('goal_amount')) {
              formData.set('goal_amount', parseFloat(formData.get('goal_amount')));
          }
          if (formData.has('category_id')) {
              formData.set('category_id', parseInt(formData.get('category_id')));
          }
      }

      // Log the exact data being sent for debugging
      if (formData instanceof FormData) {
          console.log('Sending updated form data:');
          for (let pair of formData.entries()) {
              console.log(`${pair[0]}: ${pair[1]}`);
          }
      }

      const response = await api.put(`/api/v1/projects/${projectId}`, formData);
      return response.data;
  } catch (error) {
      console.error('Project update error:', {
          status: error.response?.status,
          data: error.response?.data,
          errorMessage: error.response?.data?.message,
          validationErrors: error.response?.data?.errors,
          message: error.message
      });
      throw new Error(error.response?.data?.message || error.message);
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
        // Ensure we're returning an object with a 'data' property
        return {
            data: response.data.data || response.data || []
        };
    } catch (error) {
        console.error('Error fetching categories:', error);
        // Return an empty list in case of error
        return { data: [] };
    }
};

export const fetchBackedProjects = async (userId, page = 1, perPage = 20, status = null) => {
    try {
      const params = {
        page,
        per_page: perPage
      };
      
      if (status && status !== 'all') {
        params.status = status.toUpperCase();
      }
      
      // Use the "me" or "current" endpoint if userId is 'current'
      const endpoint = userId === 'current' 
        ? `/api/v1/backers/me/backed-projects` 
        : `/api/v1/backers/users/${userId}/backed-projects`;
      
      const response = await api.get(endpoint, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching backed projects:', error);
      throw error;
    }
  };

export const shareProject = async (projectId) => {
    try {
        const response = await api.post(`/api/v1/projects/${projectId}/share`);
        return response.data;
    } catch (error) {
        console.error('Error sharing project:', error);
        throw error;
    }
};

// Add this to projectService.js
export const fetchUserProjects = async (userId = 'current', page = 1, perPage = 10, status = null) => {
    try {
      const params = {
        page,
        per_page: perPage
      };
      
      if (status && status !== 'all') {
        params.status = status.toUpperCase();
      }
      
      const endpoint = userId === 'current' 
        ? `/api/v1/projects/my-projects` 
        : `/api/v1/projects/users/${userId}`;
      
      const response = await api.get(endpoint, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching user projects:', error);
      throw error;
    }
  };

export const getPendingProjects = async (page = 1, perPage = 10) => {
    try {
        const response = await api.get('/api/v1/projects/pending', {
            params: { page, per_page: perPage }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching pending projects:', error);
        throw error;
    }
};

export const activateProject = async (projectId) => {
    try {
        const response = await api.post(`/api/v1/projects/${projectId}/activate`);
        return response.data;
    } catch (error) {
        console.error('Error activating project:', error);
        throw error;
    }
};

export const fetchDiscoveryProjects = async () => {
  try {
    const response = await api.get('/api/v1/projects/discovery');
    return response.data;
  } catch (error) {
    console.error('Error fetching discovery projects:', error);
    throw error;
  }
};

// You can also add a more specialized function for featured projects
export const fetchFeaturedProjects = async (count = 5) => {
  try {
    const response = await api.get('/api/v1/projects/', {
      params: {
        featured: true,
        status: 'ACTIVE',
        per_page: count,
        sort_by: 'current_amount',
        sort_order: 'desc'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching featured projects:', error);
    throw error;
  }
};

// Add this to your existing projectService.js file

/**
 * Get all projects with filtering, sorting and pagination
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {string} options.search - Search term
 * @param {Object} options.filters - Filter options
 * @param {string} options.sort - Sort option
 * @returns {Promise} - Promise with response data
 */
export const getAllProjects = async (options = {}) => {
  try {
    const { page = 1, search = '', filters = {}, sort = 'newest' } = options;
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('page', page);
    
    if (search) {
      queryParams.append('search', search);
    }
    
    // Add filter parameters
    queryParams.append('status', 'active');
    
    if (filters.category && filters.category.length) {
      filters.category.forEach(catId => {
        queryParams.append('category', catId);
      });
    }
    
    if (filters.progress && filters.progress.length) {
      filters.progress.forEach(progress => {
        queryParams.append('progress', progress);
      });
    }
    
    // Add sort parameter
    if (sort) {
      queryParams.append('sort', sort);
    }
    
    // FIXED: Use template literal and api.get instead of fetch
    const response = await api.get(`/api/v1/projects?${queryParams.toString()}`);
    
    // Return the actual data
    return response.data;
  } catch (error) {
    console.error('Error fetching all projects:', error);
    throw error; // Re-throw to allow error handling in component
  }
};


// Get top projects in different categories
export const fetchTopCategoryProjects = async (categoryId, count = 3) => {
  try {
    const response = await api.get('/api/v1/projects/', {
      params: {
        category_id: categoryId,
        status: 'ACTIVE',
        per_page: count,
        sort_by: 'current_amount',
        sort_order: 'desc'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching top projects for category ${categoryId}:`, error);
    throw error;
  }
};

export const getCategoryProjects = async (categoryId, page = 1, perPage = 12) => {
    try {
        // Get projects for category
        const response = await api.get(`/api/v1/projects`, {
            params: {
                category_id: categoryId,
                page,
                per_page: perPage,
                status: 'active'
            }
        });
        
        // Get category details
        const categoryResponse = await api.get(`/api/v1/categories/${categoryId}`);
        
        // Add category information to each project
        const projectsWithCategory = (response.data.data.projects || []).map(project => ({
            ...project,
            category: categoryResponse.data.name,
            category_name: categoryResponse.data.name
        }));
        
        return {
            data: {
                projects: projectsWithCategory,
                category: categoryResponse.data,
                pages: response.data.data.pages || 1,
                currentPage: page,
                total: response.data.data.total || 0
            }
        };
    } catch (error) {
        console.error('Error fetching category projects:', error);
        throw error;
    }
};

export const revokeProject = async (projectId) => {
    try {
      const response = await api.post(`/api/v1/projects/${projectId}/revoke`);
      return response.data;
    } catch (error) {
      console.error('Error revoking project:', error);
      throw error;
    }
  };
  
  export const toggleProjectFeature = async (projectId) => {
    try {
      const response = await api.post(`/api/v1/projects/${projectId}/feature`);
      return response.data;
    } catch (error) {
      console.error('Error toggling project feature status:', error);
      throw error;
    }
  };

export const saveProject = async (projectId) => {
    try {
      // Fixed: use api instance instead of AppWindowMacIcon
      const response = await api.post(`/api/v1/projects/${projectId}/save`);
      return response.data;
    } catch (error) {
      throw error;
    }
  };
  
  export const unsaveProject = async (projectId) => {
    try {
      const response = await api.delete(`/api/v1/projects/${projectId}/save`);
      return response.data;
    } catch (error) {
      throw error;
    }
  };
  
  export const getSavedProjects = async (page = 1, perPage = 10) => {
    try {
      const response = await api.get(`/api/v1/projects/saved`, {
        params: { page, per_page: perPage }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };
  