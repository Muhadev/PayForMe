// src/components/layout/HeroSection.js

import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import './HeroSection.css'; // Create a CSS file for styling
import imagePath from '../assets/image.jpg';

function HeroSection() {
  return (
    <section className="hero-section">
      <Container>
        <Row className="align-items-center">
          <Col md={6}>
            <div className="hero-content">
              <h1>Support the Causes You Believe In</h1>
              <p>Join our community and help fund projects that matter to you. Whether it’s tech innovation, arts, or community development, your support makes a difference.</p>
              <Button variant="primary" className="mt-3">Start a Project</Button>
              <Button variant="secondary" className="mt-3 ml-3">Browse Projects</Button>
            </div>
          </Col>
          <Col md={6}>
            <img src={imagePath} alt="PayForMe" className="img-fluid" />
          </Col>
        </Row>
      </Container>
    </section>
  );
}

export default HeroSection;
