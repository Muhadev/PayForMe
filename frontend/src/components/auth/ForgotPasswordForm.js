import React, { useState } from 'react';
import axios from 'axios';
import { Container, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './ForgotPasswordForm.css';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    
    // Client-side validation
    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/auth/password-reset-request`,
        { email: email.toLowerCase().trim() },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.status === 200) {
        setEmailSent(true);
        toast.success('Password reset instructions have been sent to your email');
        
        // Delay navigation to allow user to see the toast
        setTimeout(() => {
          navigate('/password-reset-success');
        }, 2000);
        
        setEmail('');
      }
    } catch (error) {
      // Enhanced error handling
      if (error.code === 'ECONNABORTED') {
        setErrorMessage('Request timed out. Please try again.');
      } else if (error.response?.status === 429) {
        setErrorMessage('Too many attempts. Please try again later.');
      } else if (error.response?.status === 404) {
        // For security, don't reveal if email exists
        setEmailSent(true);
        toast.success('If an account exists, reset instructions will be sent.');
      } else {
        setErrorMessage('An error occurred. Please try again later.');
      }
      console.error('Password reset error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <Container>
        <Row className="justify-content-center">
          <Col md={10} lg={5}>
            <div className="forgot-password-form">
              <h2>Reset Your Password</h2>
              <p className="description">
                Enter your email address and we'll send you instructions to reset your password.
              </p>

              {!emailSent ? (
                <Form onSubmit={handleSubmit} noValidate>
                  <Form.Group controlId="formBasicEmail">
                    <Form.Label>Email address</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      aria-label="Email address"
                      aria-required="true"
                      autoComplete="email"
                      className={errorMessage ? 'is-invalid' : ''}
                    />
                  </Form.Group>

                  {errorMessage && (
                    <Alert variant="danger" className="mt-3">
                      {errorMessage}
                    </Alert>
                  )}

                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={isLoading} 
                    className="w-100 mt-3"
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Sending...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </Form>
              ) : (
                <Alert variant="success">
                  Check your email for password reset instructions.
                </Alert>
              )}

              <div className="footer-links mt-4">
                <p>
                  Remember your password? <a href="/signin">Sign in</a>
                </p>
                <p>
                  Don't have an account? <a href="/register">Sign up</a>
                </p>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default ForgotPasswordForm;