import React, { useState } from 'react';
import axios from 'axios';
import { Container, Form, Button, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Ensure CSS is imported for styling
import './SignInPage.css'; // Import custom CSS for styling

function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/v1/auth/login`, {
        email: email,
        password: password,
      });

      if (response.status === 200) {
        // Save tokens to local storage or cookies
        localStorage.setItem('accessToken', response.data.access_token);
        localStorage.setItem('refreshToken', response.data.refresh_token);

        // Show success message using toast
        toast.success('Login successful! Redirecting to dashboard.');

        // Redirect to the dashboard or home page after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000); // Optional delay to let the user see the message
      }
    } catch (error) {
      // Handle login errors
      setErrorMessage(error.response?.data?.msg || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
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