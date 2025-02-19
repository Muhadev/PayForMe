import { useState, useEffect, useCallback } from 'react';
import { jwtDecode } from "jwt-decode";
import axiosInstance from '../helper/axiosConfig';

export const usePermission = () => {
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userId, setUserId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [projectRoles, setProjectRoles] = useState({});

  const fetchUserPermissions = async (userId) => {
    try {
      const response = await axiosInstance.get(`/api/v1/role-permissions/${userId}/permissions`);
      if (response.data.success) {
        setPermissions(response.data.data.permissions);
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to fetch user permissions:', error);
      setIsLoaded(true);
    }
  };

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

        if (decoded.permissions) {
          setPermissions(decoded.permissions);
          setIsLoaded(true);
        } else {
          fetchUserPermissions(decoded.sub);
        }
      } catch (error) {
        console.error('Invalid token:', error);
        setIsLoaded(true);
      }
    };

    loadTokenData();
  }, []);

  const fetchProjectRoles = async (projectId) => {
    try {
      const response = await axiosInstance.get(`/api/v1/projects/${projectId}/roles`);
      if (response.data.success) {
        // Store both project roles and creator information
        setProjectRoles(prev => ({
          ...prev,
          [projectId]: {
            roles: response.data.data.roles,
            isCreator: response.data.data.isCreator // Add this flag from backend
          }
        }));
      }
    } catch (error) {
      console.error('Failed to fetch project roles:', error);
    }
  };

  const hasRole = (roleToCheck) => {
    return roles.includes(roleToCheck);
  };

  const hasPermission = (permissionToCheck) => {
    return permissions.includes(permissionToCheck);
  };

  const isProjectCreator = useCallback((project) => {
    if (!project || !userId) return false;
    
    // Check project-specific role from projectRoles state
    const projectRole = projectRoles[project.id];
    if (projectRole) {
      return projectRole.isCreator || projectRole.roles.includes('creator');
    }
    
    // Fallback to checking creator_id
    return userId === project.creator_id;
  }, [userId, projectRoles]);


  const canEditProject = useCallback((project) => {
    if (!project) return false;
    
    // Allow project creators to edit their projects in any state
    if (isProjectCreator(project)) return true;
    
    // Allow admins to edit non-active projects
    // if (hasRole('Admin') && project.status !== 'ACTIVE') return true;
    
    return false;
  }, [isProjectCreator, hasRole]);

  const canManageProject = useCallback((project) => {
    if (!project) return false;
    
    // Allow project creators to always manage their projects
    if (isProjectCreator(project)) return true;
    
    // Allow admins to manage any project
    // if (hasRole('Admin')) return true;
    
    return false;
  }, [isProjectCreator, hasRole]);

  const canAdministerProject = (project) => {
    if (!project) return false;
    // Admin-only actions (like featuring projects)
    return hasRole('Admin');
  };

  return {
    roles,
    permissions,
    userId,
    isLoaded,
    hasRole,
    hasPermission,
    isProjectCreator,
    canEditProject,
    canManageProject,
    canAdministerProject,
    fetchProjectRoles,
    projectRoles
  };
};

export default usePermission;