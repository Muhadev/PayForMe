import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './HeroSection.css';

function HeroSection() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleStartProject = () => {
    if (isAuthenticated) {
      navigate('/projects/create');
    } else {
      navigate('/signin', { state: { from: '/projects/create' } });
    }
  };

  const handleExploreProjects = () => {
    navigate('/projects/explore');
  };

  return (
    <section className="hero-section1">
      <div className="hero-background"></div>
      <Container>
        <Row className="align-items-center">
          <Col md={8} className="mx-auto">
            <div className="hero-content">
              <h1>Support the Causes You Believe In</h1>
              <p>Join our community and help fund projects that matter to you. Whether it's tech innovation, arts, or community development, your support makes a difference.</p>
              <div className="hero-buttons">
                <Button 
                  onClick={handleStartProject} 
                  variant="primary" 
                  className="mt-3"
                >
                  Start a Project
                </Button>
                <Button 
                  onClick={handleExploreProjects} 
                  variant="secondary" 
                  className="mt-3 ms-3"
                >
                  Browse Projects
                </Button>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
}

export default HeroSection;