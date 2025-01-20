import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useParams, useLocation } from 'react-router-dom';
import CreateProjectForm from '../components/projects/CreateProjectForm';
import './CreateProjectPage.css';

function CreateProjectPage() {
  const { id } = useParams();
  const location = useLocation();
  const isEditMode = Boolean(id);
  const isDraftEdit = location.pathname.includes('/drafts/edit');

  return (
    <Container className="create-project-page py-5">
      <Row className="justify-content-center">
        <Col md={10}>
          <Card className="shadow-sm">
            <Card.Header className="bg-white border-0 pt-4 px-4">
              <h2 className="mb-0">
                {isDraftEdit ? 'Edit Draft Project' : isEditMode ? 'Edit Project' : 'Create New Project'}
              </h2>
            </Card.Header>
            <Card.Body className="px-4 pb-4">
              <CreateProjectForm projectId={id} isDraftEdit={isDraftEdit} />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default CreateProjectPage;