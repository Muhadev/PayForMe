import React, { useState, useEffect } from 'react';
// import axios from 'axios';
import axiosInstance from '../helper/axiosConfig';
import { Container, Form, Button, Row, Col, Card, Alert, Nav } from 'react-bootstrap';
import { toast } from 'react-toastify';
import './ProfilePage.css';
import AccountSettingsPanel from './AccountSettingsPanel';
import placeholderImage from '../assets/image.png';


const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userData, setUserData] = useState({
    username: '',
    full_name: '',
    email: '',
    location: '',
    bio: '',
    website: '',
    twitter: '',
    currentProfileImage: null,
    projects_created_count: 0,
    backed_projects_count: 0,
    total_donations: 0,
    profile_image: null,
    join_date: '',
  });
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    location: '',
    bio: '',
    website: '',
    twitter: '',
    preferences: {},
    profile_image: null
  });
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosInstance.get('/api/v1/profile/');
        
        const fetchedUserData = response.data.data.user;
        setUserData({
          username: fetchedUserData.username,
          full_name: fetchedUserData.full_name || '',
          email: fetchedUserData.email || '',
          location: fetchedUserData.location || '',
          bio: fetchedUserData.bio || '',
          website: fetchedUserData.website || '',
          twitter: fetchedUserData.twitter || '',
          projects_created_count: fetchedUserData.projects_created_count || 0,
          backed_projects_count: fetchedUserData.backed_projects_count || 0,
          total_donations: fetchedUserData.total_donations || 0,
          profile_image: fetchedUserData.profile_image,
          join_date: fetchedUserData.created_at || '',
        });
        
        // Set profile data for form
        setProfileData({
          full_name: fetchedUserData.full_name || '',
          email: fetchedUserData.email || '',
          location: fetchedUserData.location || '',
          bio: fetchedUserData.bio || '',
          website: fetchedUserData.website || '',
          twitter: fetchedUserData.twitter || '',
          // preferences: fetchedUserData.preferences || {},
          profile_image: fetchedUserData.profile_image || null
        });
        
        // Set preview image if exists
        if (fetchedUserData.profile_image) {
          setPreviewImage(fetchedUserData.profile_image);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        if (error.response?.status === 404) {
          toast.error('Profile not found');
        } else {
          toast.error('Failed to load profile data');
        }
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload JPEG, PNG, or GIF.');
        return;
      }

      if (file.size > maxSize) {
        toast.error('File size exceeds 5MB limit.');
        return;
      }

      setProfileImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // const token = localStorage.getItem('token');
      
      // Prepare form data for upload
      const formData = new FormData();
      
      // Append text fields
      Object.keys(profileData).forEach(key => {
        if (key !== 'profile_image' && profileData[key]) {
          formData.append(key, profileData[key]);
        }
      });

      // Append profile image if selected
      if (profileImage) {
        formData.append('profile_image', profileImage);
      }

      const response = await axiosInstance.put('/api/v1/profile/', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      });

      // Update user data with response
      toast.success('Profile updated successfully!');
      
      // Optionally refresh profile data
      const updatedProfileResponse = await axiosInstance.get('/api/v1/profile/');
      
      const updatedUserData = updatedProfileResponse.data.data.user;
      setUserData(prevData => ({
        ...prevData,
        ...updatedUserData
      }));

    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <Container className="profile-page">
      <Row>
        <Col md={3}>
          <div className="profile-sidebar">
            <div className="profile-picture-container">
              <img
                src={previewImage || userData.profile_image || placeholderImage}
                alt="Profile"
                className="rounded-circle profile-picture"
              />
              <input 
                type="file" 
                id="profile-image-upload"
                accept="image/jpeg,image/png,image/gif"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <Button 
                variant="link" 
                className="change-photo-btn"
                onClick={() => document.getElementById('profile-image-upload').click()}
              >
                <i className="bi bi-camera"></i>
              </Button>
            </div>
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-label">Projects Launched</span>
                <span className="stat-value">{userData.projects_created_count}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Projects Backed</span>
                <span className="stat-value">{userData.backed_projects_count}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Donations</span>
                <span className="stat-value">${(parseFloat(userData.total_donations) || 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="member-since">
              Member since {new Date(userData.join_date).toLocaleDateString()}
            </div>
          </div>
        </Col>

        <Col md={9}>
          {showSuccess && (
            <Alert variant="success" className="mb-4">
              Profile updated successfully!
            </Alert>
          )}
          {showError && (
            <Alert variant="danger" className="mb-4">
              {errorMessage}
            </Alert>
          )}
          <Card>
            <Card.Header>
              <Nav variant="tabs" defaultActiveKey="profile">
                <Nav.Item>
                  <Nav.Link 
                    eventKey="profile" 
                    onClick={() => setActiveTab('profile')}
                  >
                    Profile
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    eventKey="account" 
                    onClick={() => setActiveTab('account')}
                  >
                    Account Settings
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    eventKey="notifications" 
                    onClick={() => setActiveTab('notifications')}
                  >
                    Notifications
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Card.Header>

            <Card.Body>
              {activeTab === 'profile' && (
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="full_name">
                        <Form.Label>Full Name</Form.Label>
                        <Form.Control 
                          type="text" 
                          value={profileData.full_name}
                          onChange={handleInputChange}
                          required 
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="email">
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control 
                          type="email" 
                          value={profileData.email}
                          onChange={handleInputChange}
                          required 
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3" controlId="location">
                    <Form.Label>Location</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={profileData.location || ''}
                      onChange={handleInputChange}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="bio">
                    <Form.Label>Bio</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={3} 
                      value={profileData.bio || ''}
                      onChange={handleInputChange}
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="website">
                        <Form.Label>Website</Form.Label>
                        <Form.Control 
                          type="url" 
                          value={profileData.website} // Change to value instead of defaultValue
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="twitter">
                        <Form.Label>Twitter</Form.Label>
                        <Form.Control 
                          type="text" 
                          value={profileData.twitter} // Change to value instead of defaultValue
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-between align-items-center">
                    <Button variant="primary" type="submit">
                      Save Changes
                    </Button>
                    <Button variant="outline-secondary">
                      Cancel
                    </Button>
                  </div>
                </Form>
              )}

              {activeTab === 'account' && <AccountSettingsPanel />}

              {activeTab === 'notifications' && (
                <div className="notification-settings">
                  <h5 className="mb-4">Notification Preferences</h5>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="checkbox"
                        label="Project updates from backed projects"
                        defaultChecked
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="checkbox"
                        label="New comments on my projects"
                        defaultChecked
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="checkbox"
                        label="Project recommendations"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="checkbox"
                        label="Newsletter and platform updates"
                      />
                    </Form.Group>
                    <Button variant="primary">Save Preferences</Button>
                  </Form>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ProfilePage;