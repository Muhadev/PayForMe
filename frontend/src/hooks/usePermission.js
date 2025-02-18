import { useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";
import axiosInstance from '../helper/axiosConfig';

export const usePermission = () => {
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userId, setUserId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTokenData = () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoaded(true);
        return;
      }
      
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.sub || null);
        setRoles(decoded.roles || []);
        
        // If permissions are in the token
        if (decoded.permissions) {
          setPermissions(decoded.permissions);
          setIsLoaded(true);
        } else {
          // Otherwise fetch them from the API
          fetchUserPermissions(decoded.sub);
        }
      } catch (error) {
        console.error('Invalid token:', error);
        setIsLoaded(true);
      }
    };
    
    const fetchUserPermissions = async (id) => {
      try {
        const response = await axiosInstance.get(`/api/v1/role_permissions/${id}/permissions`);
        if (response.data.success) {
          setPermissions(response.data.data.permissions);
        }
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadTokenData();
  }, []);

  const hasRole = (roleToCheck) => {
    return roles.includes(roleToCheck);
  };
  
  const hasPermission = (permissionToCheck) => {
    return permissions.includes(permissionToCheck);
  };
  
  const isCreatorOf = (resourceCreatorId) => {
    return userId === resourceCreatorId;
  };

  return {
    roles,
    permissions,
    userId,
    isLoaded,
    hasRole,
    hasPermission,
    isCreatorOf
  };
};