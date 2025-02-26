import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/AuthService';

// Create the context
const AuthContext = createContext();

// Create a provider component
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user is authenticated on initial load
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        setIsAuthenticated(true);
        // You could fetch user profile here if needed
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      const result = await AuthService.logout();
      setIsAuthenticated(false);
      setUser(null);
      navigate('/signin');
      return result;
    } catch (error) {
      console.error("Logout error in context:", error);
      // Still set as logged out
      setIsAuthenticated(false);
      setUser(null);
      navigate('/signin');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Provide the context values
  const value = {
    isAuthenticated,
    user,
    loading,
    setIsAuthenticated,
    setUser,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create a custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;