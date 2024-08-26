import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
// import { useParams } from 'react-router-dom';
import './ProjectDetailPage.css'; // Custom CSS for styling

function ProjectDetailPage() {
//   const { id } = useParams(); 
  // Assuming you're using React Router to get project ID

  // Fetch project details using the ID

  return (
    <div className="project-detail-page">
      <Container>
        <Row className="justify-content-center">
          <Col md={10}>
            <h2>Project Title</h2>
            <p className="description">Project description goes here</p>
            <Button variant="primary">Donate Now</Button>
            {/* Add more project details here */}
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default ProjectDetailPage;
