import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import CreateProjectForm from '../components/projects/CreateProjectForm';
import './CreateProjectPage.css';

function CreateProjectPage() {
  return (
    <div className="create-project-page">
      <Container>
        <Row className="justify-content-center">
          <Col md={10} lg={8}>
            <Card className="shadow-sm">
              <Card.Body>
                <h2 className="text-center mb-4">Create New Project</h2>
                {/* <Alert variant="info">
                  <Alert.Heading>Tips for a Successful Project</Alert.Heading>
                  <ul>
                    <li>Choose a clear, attention-grabbing title</li>
                    <li>Set a realistic funding goal</li>
                    <li>Provide a detailed description of your project</li>
                    <li>Add high-quality images or videos</li>
                    <li>Clearly explain how the funds will be used</li>
                  </ul>
                </Alert> */}
                <CreateProjectForm />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default CreateProjectPage;