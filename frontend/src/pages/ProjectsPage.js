import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import ProjectCard from '../components/projects/ProjectCard';
import './ProjectsPage.css'; // Custom CSS for styling

function ProjectsPage() {
  return (
    <div className="projects-page">
      <Container>
        <Row className="justify-content-center">
          <Col md={10}>
            <h2>Projects</h2>
            <p className="description">Browse and support projects</p>
            <Row>
              {/* Render ProjectCard components here */}
              <Col md={4}>
                <ProjectCard />
              </Col>
              {/* Repeat for other projects */}
            </Row>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default ProjectsPage;
