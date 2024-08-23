import React, { useState } from 'react';
import { Container, Form, Button, Row, Col } from 'react-bootstrap';
import './ForgotPasswordForm.css'; // Import custom CSS for styling

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    // Handle form submission
    console.log('Email:', email);
  };

  return (
    <div className="forgot-password-page">
      <Container>
        <Row className="justify-content-center">
          <Col md={10} lg={5}>
            <div className="forgot-password-form">
              <h2>Forgot Password</h2>
              <p className="description">Enter your email to reset your password</p>
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

                <Button variant="primary" type="submit" className="w-100">
                  Submit
                </Button>
              </Form>
              <div className="footer-links">
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
