// AboutUs.js
import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import './AboutPage.css';
import Footer from '../components/layout/Footer';

const AboutUs = () => {
  const stats = [
    { number: "500K+", label: "Backers", icon: "bi-people" },
    { number: "$50M+", label: "Funds Raised", icon: "bi-graph-up" },
    { number: "15K+", label: "Projects Funded", icon: "bi-trophy" },
    { number: "98%", label: "Success Rate", icon: "bi-shield-check" }
  ];

  const teamMembers = [
    {
      name: "Sarah Johnson",
      role: "CEO & Co-founder",
      bio: "Former VP at Goldman Sachs with 15 years in fintech"
    },
    {
      name: "Michael Chen",
      role: "CTO & Co-founder",
      bio: "Ex-Google engineer, built scalable payment systems"
    },
    {
      name: "Diana Rodriguez",
      role: "Head of Community",
      bio: "10+ years experience in community building and engagement"
    }
  ];

  return (
    <>
    <div className="about-page">
      {/* Hero Section */}
      <div className="hero-section">
        <Container>
          <Row className="justify-content-center text-center">
            <Col md={8}>
              <h1 className="hero-title">Empowering Dreams Through Community Funding</h1>
              <p className="hero-subtitle">
                PayForMe connects visionary creators with passionate backers to bring extraordinary ideas to life.
              </p>
              <button className="cta-button">Start Your Journey</button>
            </Col>
          </Row>
        </Container>
      </div>


      {/* Stats Section */}
      <Container className="section-padding">
        <Row className="justify-content-center">
          {stats.map((stat, index) => (
            <Col key={index} md={3} className="text-center mb-4">
              <div className="stat-item">
                <i className={`bi ${stat.icon} stat-icon`}></i>
                <h2 className="stat-number">{stat.number}</h2>
                <p className="stat-label">{stat.label}</p>
              </div>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Mission Section */}
      <div className="mission-section">
        <Container>
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <h2 className="section-title">Our Mission</h2>
              <p className="mission-text">
                At PayForMe, we believe everyone deserves a chance to turn their innovative ideas into reality. 
                Our platform provides the tools, resources, and community support needed to launch successful 
                crowdfunding campaigns and bring creative projects to life.
              </p>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Team Section */}
      <Container className="section-padding">
        <h2 className="section-title text-center mb-5">Meet Our Leadership Team</h2>
        <Row>
          {teamMembers.map((member, index) => (
            <Col key={index} md={4} className="mb-4">
              <Card className="team-card">
                <div className="team-member-img"></div>
                <Card.Body>
                  <h3 className="team-member-name">{member.name}</h3>
                  <p className="team-member-role">{member.role}</p>
                  <p className="team-member-bio">{member.bio}</p>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Values Section */}
      <div className="values-section">
        <Container>
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <h2 className="section-title mb-5">Our Values</h2>
              <Row>
                <Col md={6} className="mb-4">
                  <div className="value-card">
                    <h3>Transparency</h3>
                    <p>We believe in complete transparency in all our operations and project funding.</p>
                  </div>
                </Col>
                <Col md={6} className="mb-4">
                  <div className="value-card">
                    <h3>Innovation</h3>
                    <p>We encourage and support creative ideas that push boundaries.</p>
                  </div>
                </Col>
                <Col md={6} className="mb-4">
                  <div className="value-card">
                    <h3>Community</h3>
                    <p>We foster a supportive environment where creators and backers thrive together.</p>
                  </div>
                </Col>
                <Col md={6} className="mb-4">
                  <div className="value-card">
                    <h3>Security</h3>
                    <p>We prioritize the security of all transactions and user data.</p>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        </Container>
      </div>

      {/* CTA Section */}
      <Container className="section-padding text-center">
        <h2 className="section-title">Ready to Bring Your Ideas to Life?</h2>
        <p className="cta-text mb-4">Join our community of creators and backers today.</p>
        <div className="cta-buttons">
          <Button variant="primary" className="me-3">Start a Project</Button>
          <Button variant="outline-primary">Explore Projects</Button>
        </div>
      </Container>
    </div>
    <Footer />
  </>
  );
};

export default AboutUs;