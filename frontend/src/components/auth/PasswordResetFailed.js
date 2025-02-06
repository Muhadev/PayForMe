import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Button } from 'react-bootstrap';
import './PasswordResetFailed.css'; // Custom styling

function PasswordResetFailed() {
  return (
    <div className="password-reset-failed-page">
      <Container className="text-center mt-5">
        <h1 className="text-danger mb-4">Password Reset Failed</h1>
        <p className="text-muted">We couldn’t process your request at this time.</p>
        <p>Please try again later or contact support if the issue persists.</p>
        <Link to="/forgot-password">
          <Button variant="primary" className="mt-3">
            Try Again
          </Button>
        </Link>
      </Container>
    </div>
  );
}

export default PasswordResetFailed;
