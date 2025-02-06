// SettingsPage.js
import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Badge, ListGroup } from 'react-bootstrap';
import './SettingsPage.css';

const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [showSavedAlert, setShowSavedAlert] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setShowSavedAlert(true);
    setTimeout(() => setShowSavedAlert(false), 3000);
  };

  const navigationItems = [
    { key: 'general', label: 'General', icon: 'bi-gear' },
    { key: 'notifications', label: 'Notifications', icon: 'bi-bell' },
    { key: 'security', label: 'Security', icon: 'bi-shield-lock' },
    { key: 'payments', label: 'Payments', icon: 'bi-credit-card' },
    { key: 'privacy', label: 'Privacy', icon: 'bi-eye' },
    { key: 'api', label: 'API Settings', icon: 'bi-code-square' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <Form onSubmit={handleSave}>
            <Card.Title>General Settings</Card.Title>
            <Row className="mb-4">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Language</Form.Label>
                  <Form.Select defaultValue="en">
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Time Zone</Form.Label>
                  <Form.Select defaultValue="utc">
                    <option value="utc">UTC (GMT+0)</option>
                    <option value="est">Eastern Time (GMT-5)</option>
                    <option value="pst">Pacific Time (GMT-8)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Currency Display</Form.Label>
              <Form.Select defaultValue="usd">
                <option value="usd">USD ($)</option>
                <option value="eur">EUR (€)</option>
                <option value="gbp">GBP (£)</option>
              </Form.Select>
            </Form.Group>

            <Button type="submit">Save Changes</Button>
          </Form>
        );

      case 'notifications':
        return (
          <Form onSubmit={handleSave}>
            <Card.Title>Notification Preferences</Card.Title>
            <Form.Group className="mb-4">
              <Form.Label>Email Notifications</Form.Label>
              <div className="notification-options">
                <Form.Check 
                  type="switch"
                  id="project-updates"
                  label="Project Updates"
                  defaultChecked
                />
                <Form.Check 
                  type="switch"
                  id="backed-projects"
                  label="Updates from Backed Projects"
                  defaultChecked
                />
                <Form.Check 
                  type="switch"
                  id="comments"
                  label="New Comments"
                  defaultChecked
                />
                <Form.Check 
                  type="switch"
                  id="newsletter"
                  label="Newsletter"
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Push Notifications</Form.Label>
              <div className="notification-options">
                <Form.Check 
                  type="switch"
                  id="mobile-updates"
                  label="Mobile Notifications"
                  defaultChecked
                />
                <Form.Check 
                  type="switch"
                  id="browser-notifications"
                  label="Browser Notifications"
                />
              </div>
            </Form.Group>

            <Button type="submit">Save Preferences</Button>
          </Form>
        );

      case 'security':
        return (
          <>
            <Card.Title>Security Settings</Card.Title>
            <div className="security-section">
              <div className="security-item">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6>Password</h6>
                  <Button variant="outline-primary" size="sm">Change</Button>
                </div>
                <p className="text-muted">Last changed 30 days ago</p>
              </div>

              <div className="security-item">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6>Two-Factor Authentication</h6>
                  <Form.Check 
                    type="switch"
                    id="2fa-switch"
                    defaultChecked
                  />
                </div>
                <p className="text-muted">Enabled via Authenticator App</p>
              </div>

              <div className="security-item">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6>Login History</h6>
                  <Button variant="outline-secondary" size="sm">View All</Button>
                </div>
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <small>Chrome on Windows • New York, USA</small>
                    <br />
                    <small className="text-muted">Today, 2:15 PM</small>
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <small>Safari on iPhone • Boston, USA</small>
                    <br />
                    <small className="text-muted">Yesterday, 8:30 AM</small>
                  </ListGroup.Item>
                </ListGroup>
              </div>
            </div>
          </>
        );

      case 'payments':
        return (
          <>
            <Card.Title>Payment Settings</Card.Title>
            <div className="payment-section">
              <div className="payment-methods mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6>Payment Methods</h6>
                  <Button variant="outline-primary" size="sm">Add New</Button>
                </div>
                <ListGroup>
                  <ListGroup.Item className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-credit-card me-2"></i>
                      <div>
                        <div>•••• •••• •••• 4242</div>
                        <small className="text-muted">Expires 12/24</small>
                      </div>
                    </div>
                    <Badge bg="primary">Default</Badge>
                  </ListGroup.Item>
                </ListGroup>
              </div>

              <div className="billing-address">
                <h6>Billing Address</h6>
                <Form>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Street Address</Form.Label>
                        <Form.Control type="text" />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>City</Form.Label>
                        <Form.Control type="text" />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Button type="submit">Save Address</Button>
                </Form>
              </div>
            </div>
          </>
        );

      case 'privacy':
        return (
          <>
            <Card.Title>Privacy Settings</Card.Title>
            <Form onSubmit={handleSave}>
              <Form.Group className="mb-4">
                <Form.Label>Profile Visibility</Form.Label>
                <Form.Select className="mb-2">
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="backers">Backers Only</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Choose who can see your profile and activity
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Data Usage</Form.Label>
                <div className="privacy-options">
                  <Form.Check 
                    type="checkbox"
                    id="analytics"
                    label="Allow anonymous analytics"
                    defaultChecked
                  />
                  <Form.Check 
                    type="checkbox"
                    id="recommendations"
                    label="Personalized recommendations"
                    defaultChecked
                  />
                </div>
              </Form.Group>

              <Button type="submit">Save Privacy Settings</Button>
            </Form>
          </>
        );

      case 'api':
        return (
          <>
            <Card.Title>API Settings</Card.Title>
            <div className="api-section">
              <div className="api-keys mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6>API Keys</h6>
                  <Button variant="outline-primary" size="sm">Generate New Key</Button>
                </div>
                <ListGroup>
                  <ListGroup.Item>
                    <div className="d-flex justify-content-between align-items-center">
                      <code>pk_live_123456789</code>
                      <Button variant="outline-danger" size="sm">Revoke</Button>
                    </div>
                    <small className="text-muted d-block">Created: Jan 10, 2024</small>
                  </ListGroup.Item>
                </ListGroup>
              </div>

              <div className="webhook-urls">
                <h6>Webhook URLs</h6>
                <Form.Control 
                  type="url" 
                  placeholder="https://your-domain.com/webhook"
                  className="mb-2"
                />
                <Button variant="primary" size="sm">Save Webhook</Button>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Container className="settings-page">
      <h1 className="settings-title">Settings</h1>

      {showSavedAlert && (
        <Alert variant="success" className="save-alert">
          Settings saved successfully!
        </Alert>
      )}

      <Row>
        <Col md={3}>
          <div className="settings-navigation">
            <ListGroup>
              {navigationItems.map(item => (
                <ListGroup.Item
                  key={item.key}
                  action
                  active={activeSection === item.key}
                  onClick={() => setActiveSection(item.key)}
                >
                  <i className={`bi ${item.icon} me-2`}></i>
                  {item.label}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        </Col>

        <Col md={9}>
          <Card className="settings-content">
            <Card.Body>
              {renderContent()}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SettingsPage;