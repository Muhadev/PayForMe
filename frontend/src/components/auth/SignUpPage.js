import React, { useState } from 'react';
import axios from 'axios';
import { Container, Form, Button, Row, Col } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify'; // Import ToastContainer
import 'react-toastify/dist/ReactToastify.css';
import './SignUpPage.css'; // Import custom CSS for styling

function SignUpPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(''); // Clear previous error message
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/auth/register`,
        {
          username,
          email,
          password,
          full_name: fullName,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 201) {
        const { token } = response.data; // Ensure your API returns the token here
        localStorage.setItem('token', token); // Save the token in local storage
        // Show a success message using a toast
        toast.success('Registration successful! Please check your email to verify your account.');
      
        // Redirect to the login page
        setTimeout(() => {
          window.location.href = '/signin';
        }, 2000); // Optional delay to let the user see the message
      }
    } catch (error) {
      if (error.response) {
        // Server returned an error
        setErrorMessage(error.response.data.msg || 'Registration failed. Please try again.');
      } else {
        // Network error or no response
        setErrorMessage('Network error. Please try again later.');
      }
    } finally {
      setIsLoading(false); // Stop loading
    }
  };
  return (
    <div className="signup-page">
      <Container>
        <Row className="justify-content-center">
          <Col md={10} lg={5}>
            <div className="signup-form">
              <h2>Sign Up</h2>
              <p className="description">Create a new account</p>
              <Form onSubmit={handleSubmit}>
            <Form.Group controlId="formBasicFullName">
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group controlId="formBasicUsername">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group controlId="formBasicEmail">
              <Form.Label>Email address</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group controlId="formBasicPassword">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>

            {errorMessage && <p className="text-danger">{errorMessage}</p>}

            <Button variant="primary" type="submit" disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Register'}
            </Button>
          </Form>
          <ToastContainer />
              <div className="footer-links">
                <p>
                  Already have an account? <a href="/signin">Sign in</a>
                </p>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default SignUpPage;