import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Button, Card, Alert } from 'react-bootstrap';
import { FaCheckCircle, FaEnvelope } from 'react-icons/fa';
import './PasswordResetSuccess.css';

function PasswordResetSuccess() {
  return (
    <div className="password-reset-success-page">
      <Container>
        <Card className="success-card">
          <Card.Body className="text-center">
            <div className="success-icon mb-4">
              <FaCheckCircle size={50} className="text-success" />
            </div>

            <h1 className="success-title mb-4">Check Your Email</h1>

            <div className="email-icon-container mb-4">
              <FaEnvelope size={30} className="text-primary" />
            </div>

            <Alert variant="success" className="instruction-box">
              <p className="mb-2">We've sent password reset instructions to your email address.</p>
              <p className="mb-0">
                The link in the email will expire in 30 minutes for security reasons.
              </p>
            </Alert>

            <div className="next-steps mt-4">
              <h5>Next steps:</h5>
              <ol className="text-start">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the reset link in the email</li>
                <li>Create your new password</li>
              </ol>
            </div>

            <div className="help-text mt-4">
              <p className="text-muted">
                Didn't receive the email? Check your spam folder or contact support.
              </p>
            </div>

            <div className="action-buttons mt-4">
              <Link to="/signin">
                <Button variant="primary" className="me-3">
                  Return to Sign In
                </Button>
              </Link>
              <Link to="/contact-support">
                <Button variant="outline-secondary">
                  Contact Support
                </Button>
              </Link>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}

export default PasswordResetSuccess;