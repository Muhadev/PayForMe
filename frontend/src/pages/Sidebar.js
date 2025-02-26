import React, { useState, useEffect } from 'react';
import { Card, Nav, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTachometerAlt, 
  faProjectDiagram, 
  faBookmark, 
  faHandHoldingUsd, 
  faUserCircle, 
  faCog, 
  faSignOutAlt,
  faBars
} from '@fortawesome/free-solid-svg-icons';
import { NavLink } from 'react-router-dom';
import profileholderImage from '../assets/news2.png';
import { useAuth } from '../context/AuthContext'; // Import the auth context
import axiosInstance from '../helper/axiosConfig';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { logout, loading, user } = useAuth(); // Use the auth context
  const [profileData, setProfileData] = useState({
    fullName: '',
    profileImage: profileholderImage
  });
  const [isLoading, setIsLoading] = useState(true);

  // Function to get media URL (similar to the one in ProjectDetailPage)
  const getMediaUrl = (url) => {
    if (!url) return null;
    
    const backendUrl = process.env.REACT_APP_BACKEND_URL;
    
    // If it's already an absolute URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's a relative path starting with /uploads
    if (url.startsWith('/uploads/')) {
      return `${backendUrl}/api/v1${url}`;
    }
    
    // If it's just a filename, construct the full path
    if (!url.startsWith('/')) {
      return `${backendUrl}/api/v1/uploads/${url}`;
    }
    
    // Default case: append to backend URL
    return `${backendUrl}${url}`;
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get('/api/v1/profile/');
        const userData = response.data.data.user;
        
        // Update profile data with user info
        setProfileData({
          fullName: userData.full_name || 'User',
          profileImage: userData.profile_image ? getMediaUrl(userData.profile_image) : profileholderImage
        });
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        // Keep default values on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      // No need to navigate here, the context handles it
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const navItems = [
    { path: "/dashboard", name: "Dashboard", icon: faTachometerAlt },
    { path: "/my-projects", name: "My Projects", icon: faProjectDiagram },
    { path: "/saved-projects", name: "Saved Projects", icon: faBookmark },
    { path: "/backed-projects", name: "Backed Projects", icon: faHandHoldingUsd },
    { path: "/profile", name: "Profile", icon: faUserCircle },
    { path: "/settings", name: "Settings", icon: faCog },
  ];

  return (
    <div className={`sidebar-wrapper ${collapsed ? 'collapsed' : ''}`}>
      <Button 
        variant="light" 
        className="sidebar-toggle d-md-none" 
        onClick={toggleSidebar}
      >
        <FontAwesomeIcon icon={faBars} />
      </Button>
      
      <Card className="sidebar-card">
        <Card.Body className="p-0">
          <div className="sidebar-header">
            <img
              src={profileData.profileImage}
              alt="Profile"
              className="profile-image"
              style={{ 
                objectFit: 'cover',
                width: '60px',
                height: '60px',
                borderRadius: '50%'
              }}
            />
            {!collapsed && (
              <h5 className="user-name">
                {isLoading ? 'Loading...' : profileData.fullName}
              </h5>
            )}
          </div>
          
          <Nav className="sidebar-nav flex-column">
            {navItems.map((item) => (
              <Nav.Link 
                as={NavLink} 
                to={item.path} 
                className="sidebar-link" 
                activeclassname="active"
                key={item.path}
              >
                <FontAwesomeIcon icon={item.icon} className="nav-icon" />
                {!collapsed && <span className="nav-text">{item.name}</span>}
              </Nav.Link>
            ))}
          </Nav>
          
          <div className="sidebar-footer">
            <Button 
              variant="outline-danger" 
              className="logout-button"
              onClick={handleLogout}
              disabled={loading}
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="nav-icon" />
              {!collapsed && <span className="nav-text">
                {loading ? 'Logging out...' : 'Logout'}
              </span>}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Sidebar;