import React, { useState } from 'react';
import { Form, Button, Alert, Card, Container, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axiosInstance from '../helper/axiosConfig';
import TwoFactorAuthSection from './TwoFactorAuthSection';

const AccountSettingsPanel = () => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await axiosInstance.post('/api/v1/auth/change-password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      setIsLoading(true);
      try {
        await axiosInstance.delete('/api/v1/profile/');
        toast.success('Account deleted successfully');
        window.location.href = '/';
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete account');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="account-settings-container">
      <Card className="mb-4">
        <Card.Header className="bg-white border-bottom-0 pt-4">
          <Card.Title className="mb-0">Change Password</Card.Title>
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handlePasswordChange}>
            <Row className="justify-content-center">
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted">Current Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      currentPassword: e.target.value
                    }))}
                    required
                    size="sm"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted">New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      newPassword: e.target.value
                    }))}
                    required
                    size="sm"
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="small text-muted">Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      confirmPassword: e.target.value
                    }))}
                    required
                    size="sm"
                  />
                </Form.Group>

                <div className="d-grid">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={isLoading}
                    size="sm"
                  >
                    {isLoading ? 'Changing Password...' : 'Change Password'}
                  </Button>
                </div>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      <TwoFactorAuthSection />

      <Card className="border-danger">
        <Card.Header className="bg-white border-bottom-0 pt-4">
          <Card.Title className="mb-0 text-danger">Delete Account</Card.Title>
        </Card.Header>
        <Card.Body>
          <Row className="justify-content-center">
            <Col md={8}>
              <Alert variant="danger" className="py-2">
                <p className="small mb-0">
                  <strong>Warning:</strong> This action cannot be undone. All your data will be permanently deleted.
                </p>
              </Alert>
              <Button 
                variant="danger"
                onClick={handleDeleteAccount}
                disabled={isLoading}
                size="sm"
                className="w-100 mt-3"
              >
                Delete Account
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AccountSettingsPanel;