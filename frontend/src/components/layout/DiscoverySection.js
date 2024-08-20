// src/components/layout/DiscoverySection.js

import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import './DiscoverySection.css';
import imagePath from '../../assets/featured-image.png'; // Add an image for the left card
import fundraiserImage1 from '../../assets/features1.png';
import fundraiserImage2 from '../../assets/feature2.png';
import fundraiserImage3 from '../../assets/feature3.png';
import fundraiserImage4 from '../../assets/feature4.png';

const fundraisers = [
  {
    title: "Support Mia’s Surgery",
    donations: "5.6K donations",
    amount: "$132,926 raised",
    image: fundraiserImage1,
  },
  {
    title: "A New School for Children in Kenya",
    donations: "8.4K donations",
    amount: "$200,140 raised",
    image: fundraiserImage3,
  },
  {
    title: "Medical Fund for Liam’s Cancer Treatment",
    donations: "12.3K donations",
    amount: "$320,461 raised",
    image: fundraiserImage4,
  },
  {
    title: "Help Save the Amazon Rainforest",
    donations: "15.7K donations",
    amount: "$500,926 raised",
    image: fundraiserImage2,
  },
];

function DiscoverySection() {
  return (
    <section className="discovery-section">
      <Container>
      <div className="discovery-header">
          <h2>Discover Fundraisers That Matter to You</h2>
          <p>Explore impactful projects around the world that need your support.</p>
        </div>
        <Row>
          {/* Left Side: Featured Card with Image */}
          <Col md={6}>
            <Card className="featured-card">
              <Card.Img variant="top" src={imagePath} alt="Featured Fundraiser" />
              <Card.Body>
                <Card.Title>Help John Rebuild After the Storm</Card.Title>
                <Card.Text>10.2K donations</Card.Text>
                <Card.Text className="amount-raised">$250,420 raised</Card.Text>
                <Button variant="primary">Learn More</Button>
              </Card.Body>
            </Card>
          </Col>

          {/* Right Side: Grid of Four Fundraisers */}
          <Col md={6}>
            <Row>
              {fundraisers.map((fundraiser, index) => (
                <Col md={6} key={index} className="d-flex align-items-stretch">
                  <Card className="fundraiser-card">
                    <Card.Img variant="top" src={fundraiser.image} alt={fundraiser.title} />
                    <Card.Body className="d-flex flex-column">
                      <Card.Title>{fundraiser.title}</Card.Title>
                      <Card.Text>{fundraiser.donations}</Card.Text>
                      <Card.Text className="amount-raised">{fundraiser.amount}</Card.Text>
                      <Button variant="primary" className="mt-auto">Learn More</Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      </Container>
    </section>
  );
}

export default DiscoverySection;
