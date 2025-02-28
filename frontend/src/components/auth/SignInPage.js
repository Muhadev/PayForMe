import React, { useState, useEffect, useCallback } from 'react';
import { Container, Form, Button, Row, Col } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../../helper/axiosConfig';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './SignInPage.css';

function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Memoize handleSuccessfulLogin to prevent unnecessary re-renders
  const handleSuccessfulLogin = useCallback((access_token, refresh_token) => {
    if (!access_token || !refresh_token) {
      toast.error('Authentication failed: No tokens received.');
      return;
    }
    
    localStorage.setItem('accessToken', access_token);
    localStorage.setItem('refreshToken', refresh_token);
  
    toast.success('Login successful! Redirecting to dashboard...');
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  }, [navigate]);

  // Handle tokens in URL parameters (for Google OAuth)
  useEffect(() => {
    // Check for tokens directly in the URL
    const access_token = searchParams.get('access_token');
    const refresh_token = searchParams.get('refresh_token');
    
    if (access_token && refresh_token) {
      console.log("Found tokens in URL, handling login...");
      handleSuccessfulLogin(access_token, refresh_token);
    }
    
    // Also check for error messages
    const error = searchParams.get('error');
    if (error) {
      toast.error(`Authentication error: ${error}`);
    }
  }, [searchParams, handleSuccessfulLogin]);
  
  // Standard Email Login
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await axiosInstance.post('/api/v1/auth/login', {
        email,
        password,
      });

      if (response.status === 200) {
        const { access_token, refresh_token } = response.data;
        handleSuccessfulLogin(access_token, refresh_token);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.error('Login failed. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Google Login Handler
  const handleGoogleLogin = async () => {
    try {
      // Clear any existing tokens before starting the OAuth flow
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to backend's Google OAuth route
      window.location.href = `${process.env.REACT_APP_BACKEND_URL}/api/v1/google_auth/login/google`;
    } catch (error) {
      console.error('Google Login Error:', error);
      toast.error('Google login failed. Please try again.');
    }
  };

  return (
    <div className="signin-page">
      <Container>
        <Row className="justify-content-center">
          <Col md={10} lg={5}>
            <div className="signin-form">
              <h2>Sign In</h2>
              <p className="description">Access your PayForMe account</p>
              
              {/* Google Sign-In Button */}
              <div className="google-signin-container">
                <Button 
                  onClick={handleGoogleLogin}
                  className="google-btn"
                  disabled={isLoading}
                >
                  <img 
                    src="https://developers.google.com/identity/images/g-logo.png" 
                    alt="Google logo" 
                    className="google-icon"
                  />
                  Sign in with Google
                </Button>
              </div>

              <div className="or-divider">
                <span>OR</span>
              </div>

              {/* Email Login Form */}
              <Form onSubmit={handleSubmit}>
                <Form.Group controlId="formBasicEmail">
                  <Form.Label>Email address</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group controlId="formBasicPassword">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Form.Group>

                {errorMessage && <p className="text-danger">{errorMessage}</p>}

                <Button variant="primary" type="submit" disabled={isLoading}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </Form>

              <div className="footer-links">
                <p>
                  <a href="/forgot-password">Forgot password?</a>
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

export default SignInPage;