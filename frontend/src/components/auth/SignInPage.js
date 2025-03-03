import React, { useState, useEffect, useCallback } from 'react';
import { Container, Form, Button, Row, Col } from 'react-bootstrap';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import axiosInstance from '../../helper/axiosConfig';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../../context/AuthContext';
import './SignInPage.css';

function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { setIsAuthenticated } = useAuth();
  
  // Get the intended destination from location state, or default to dashboard
  const from = location.state?.from || '/dashboard';

  // Memoize handleSuccessfulLogin to prevent unnecessary re-renders
  const handleSuccessfulLogin = useCallback((access_token, refresh_token) => {
    if (!access_token || !refresh_token) {
      toast.error('Authentication failed: No tokens received.');
      return;
    }
    
    localStorage.setItem('accessToken', access_token);
    localStorage.setItem('refreshToken', refresh_token);
    
    // Update authentication state
    setIsAuthenticated(true);
  
    toast.success('Login successful! Redirecting...');
    setTimeout(() => {
      // Redirect to the intended destination or dashboard if none specified
      navigate(from, { replace: true });
    }, 1000);
  }, [navigate, setIsAuthenticated, from]);

  // Handle tokens in URL parameters (for Google OAuth)
  useEffect(() => {
    const access_token = searchParams.get('access_token');
    const refresh_token = searchParams.get('refresh_token');
    
    if (access_token && refresh_token) {
      handleSuccessfulLogin(access_token, refresh_token);
    }
    
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
        setErrorMessage('Invalid email or password');
        toast.error('Invalid email or password. Please try again.');
      } else {
        setErrorMessage('Login failed. Please try again later.');
        toast.error('Login failed. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Google Login Handler
  const handleGoogleLogin = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      const redirectUrl = encodeURIComponent(from);
      window.location.href = `${process.env.REACT_APP_BACKEND_URL}/api/v1/google_auth/login/google?redirect_path=${redirectUrl}`;
    } catch (error) {
      console.error('Google Login Error:', error);
      toast.error('Google login failed. Please try again.');
    }
  };

  return (
    <div className="signin-page">
      <Container>
        <div className="signin-form">
          <h2>Sign In</h2>
          <p className="description">Access your PayForMe account</p>
          
          {/* Display message if redirected from a protected route */}
          {location.state?.from && (
            <div className="alert alert-info">
              You need to sign in to access that page
            </div>
          )}
          
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
            <Form.Group controlId="formBasicEmail" className="form-group">
              <Form.Label>Email address</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group controlId="formBasicPassword" className="form-group">
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

            <Button variant="primary" type="submit" disabled={isLoading} className="button button-primary">
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
      </Container>
    </div>
  );
}

export default SignInPage;