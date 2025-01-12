// ProfilePage.js
import React, { useState } from 'react';
import { Container, Form, Button, Row, Col, Card, Alert, Nav } from 'react-bootstrap';
import './ProfilePage.css';

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showSuccess, setShowSuccess] = useState(false);

  const userData = {
    name: "John Doe",
    email: "john.doe@example.com",
    location: "New York, USA",
    bio: "Passionate creator and innovator",
    website: "www.johndoe.com",
    twitter: "@johndoe",
    joinDate: "January 2023",
    projectsLaunched: 5,
    projectsBacked: 12,
    totalRaised: 25000,
    successRate: 80
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <Container className="profile-page">
      <Row>
        <Col md={3}>
          <div className="profile-sidebar">
            <div className="profile-picture-container">
              <img
                src="https://via.placeholder.com/150"
                alt="Profile"
                className="rounded-circle profile-picture"
              />
              <Button variant="link" className="change-photo-btn">
                <i className="bi bi-camera"></i>
              </Button>
            </div>
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-label">Projects Launched</span>
                <span className="stat-value">{userData.projectsLaunched}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Projects Backed</span>
                <span className="stat-value">{userData.projectsBacked}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Success Rate</span>
                <span className="stat-value">{userData.successRate}%</span>
              </div>
            </div>
            <div className="member-since">
              Member since {userData.joinDate}
            </div>
          </div>
        </Col>

        <Col md={9}>
          {showSuccess && (
            <Alert variant="success" className="mb-4">
              Profile updated successfully!
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
                      <Form.Group className="mb-3" controlId="name">
                        <Form.Label>Full Name</Form.Label>
                        <Form.Control 
                          type="text" 
                          defaultValue={userData.name}
                          required 
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="email">
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control 
                          type="email" 
                          defaultValue={userData.email}
                          required 
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3" controlId="location">
                    <Form.Label>Location</Form.Label>
                    <Form.Control 
                      type="text" 
                      defaultValue={userData.location}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="bio">
                    <Form.Label>Bio</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={3} 
                      defaultValue={userData.bio}
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="website">
                        <Form.Label>Website</Form.Label>
                        <Form.Control 
                          type="url" 
                          defaultValue={userData.website}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="twitter">
                        <Form.Label>Twitter</Form.Label>
                        <Form.Control 
                          type="text" 
                          defaultValue={userData.twitter}
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

              {activeTab === 'account' && (
                <div className="account-settings">
                  <h5 className="mb-4">Account Settings</h5>
                  <Form>
                    <Form.Group className="mb-4">
                      <Form.Label>Change Password</Form.Label>
                      <Form.Control 
                        type="password" 
                        placeholder="Current password" 
                        className="mb-2"
                      />
                      <Form.Control 
                        type="password" 
                        placeholder="New password" 
                        className="mb-2"
                      />
                      <Form.Control 
                        type="password" 
                        placeholder="Confirm new password" 
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Two-Factor Authentication</Form.Label>
                      <div className="d-flex align-items-center">
                        <Form.Check 
                          type="switch"
                          id="2fa-switch"
                          label="Enable two-factor authentication"
                        />
                      </div>
                    </Form.Group>

                    <Button variant="danger">Delete Account</Button>
                  </Form>
                </div>
              )}

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