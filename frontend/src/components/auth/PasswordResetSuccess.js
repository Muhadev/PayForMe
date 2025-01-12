import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Button } from 'react-bootstrap';
import './PasswordResetSuccess.css'; // Custom styling

function PasswordResetSuccess() {
  return (
    <div className="password-reset-success-page">
      <Container className="text-center mt-5">
        <h1 className="text-success mb-4">Password Reset Email Sent</h1>
        <p className="text-muted">
          If an account with the email you entered exists, we’ve sent a password reset link.
        </p>
        <p>Please check your email inbox and follow the instructions to reset your password.</p>
        <Link to="/signin">
          <Button variant="primary" className="mt-3">
            Back to Sign In
          </Button>
        </Link>
      </Container>
    </div>
  );
}

export default PasswordResetSuccess;
