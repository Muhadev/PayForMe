import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Container, Alert, Button } from 'react-bootstrap';
import './VerifyEmailPage.css'; // Custom CSS file for additional styles

function VerifyEmailPage() {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const location = useLocation();

  useEffect(() => {
    // Extract query parameters from the URL
    const queryParams = new URLSearchParams(location.search);
    const verificationStatus = queryParams.get('status');
    const verificationMessage = queryParams.get('message');

    setStatus(verificationStatus);
    setMessage(verificationMessage || 'Unknown error occurred.');
  }, [location.search]);

  return (
    <div className="verify-email-page">
        <Container className="text-center mt-5">
          {status === 'success' ? (
            <div className="success-container">
              <Alert variant="success" className="py-4">
                <h4 className="alert-heading">🎉 Email Verified Successfully!</h4>
                <p>{message}</p>
                <Button href="/signin" variant="primary" className="mt-3">
                  Go to Login
                </Button>
              </Alert>
            </div>
          ) : status === 'error' ? (
            <div className="error-container">
              <Alert variant="danger" className="py-4">
                <h4 className="alert-heading">⚠️ Email Verification Failed</h4>
                <p>{message}</p>
                <Button href="/" variant="secondary" className="mt-3">
                  Back to Home
                </Button>
              </Alert>
            </div>
          ) : (
            <div className="loading-container">
              <h5>Verifying your email...</h5>
              <div className="loading-spinner"></div>
            </div>
          )}
        </Container>
      </div>
  );
}

export default VerifyEmailPage;
