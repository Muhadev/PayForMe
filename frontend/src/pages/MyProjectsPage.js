// MyProjectsPage.js
import React, { useState } from 'react';
import { Container, Row, Col, Card, Badge, Button, Nav, Modal, Form } from 'react-bootstrap';
import './MyProjectsPage.css';

const MyProjectsPage = () => {
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const projects = [
    {
      id: 1,
      title: "Smart Garden Monitor",
      description: "An IoT device that monitors your garden's health",
      imageUrl: "https://via.placeholder.com/400x200",
      totalPledged: 15000,
      goal: 20000,
      backers: 350,
      daysLeft: 15,
      status: "active",
      category: "Technology",
      lastUpdate: "2024-01-05",
      launchDate: "2023-12-20"
    },
    {
      id: 2,
      title: "Sustainable Fashion Line",
      description: "Eco-friendly clothing made from recycled materials",
      imageUrl: "https://via.placeholder.com/400x200",
      totalPledged: 50000,
      goal: 45000,
      backers: 800,
      daysLeft: 0,
      status: "successful",
      category: "Fashion",
      lastUpdate: "2024-01-08",
      launchDate: "2023-11-15"
    },
    {
      id: 3,
      title: "Children's Book Series",
      description: "Educational adventure books for young readers",
      imageUrl: "https://via.placeholder.com/400x200",
      totalPledged: 8000,
      goal: 25000,
      backers: 200,
      daysLeft: -5,
      status: "draft",
      category: "Publishing",
      lastUpdate: "2024-01-01",
      launchDate: null
    }
  ];

  const filteredProjects = filter === 'all' 
    ? projects 
    : projects.filter(project => project.status === filter);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'bg-success';
      case 'successful':
        return 'bg-primary';
      case 'draft':
        return 'bg-secondary';
      default:
        return 'bg-danger';
    }
  };

  return (
    <Container className="my-projects-page">
      <div className="header-section">
        <div className="title-section">
          <h1>My Projects</h1>
          <Badge bg="primary" className="project-count">
            {projects.length} Projects
          </Badge>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <i className="bi bi-plus-lg"></i> Create New Project
        </Button>
      </div>

      <Nav variant="tabs" className="project-tabs">
        <Nav.Item>
          <Nav.Link 
            active={filter === 'all'} 
            onClick={() => setFilter('all')}
          >
            All Projects
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={filter === 'draft'} 
            onClick={() => setFilter('draft')}
          >
            Drafts
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={filter === 'active'} 
            onClick={() => setFilter('active')}
          >
            Active
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={filter === 'successful'} 
            onClick={() => setFilter('successful')}
          >
            Successful
          </Nav.Link>
        </Nav.Item>
      </Nav>

      <Row className="project-grid">
        {filteredProjects.map((project) => (
          <Col md={4} key={project.id} className="mb-4">
            <Card className="project-card h-100">
              <Card.Img variant="top" src={project.imageUrl} />
              <Card.Body>
                <div className="card-header-content">
                  <div>
                    <Card.Title>{project.title}</Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">
                      {project.category}
                    </Card.Subtitle>
                  </div>
                  <Badge className={getStatusBadgeClass(project.status)}>
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </Badge>
                </div>

                <Card.Text className="project-description">
                  {project.description}
                </Card.Text>

                {project.status !== 'draft' && (
                  <div className="progress-section">
                    <div className="progress">
                      <div 
                        className="progress-bar" 
                        role="progressbar"
                        style={{ width: `${(project.totalPledged / project.goal) * 100}%` }}
                        aria-valuenow={(project.totalPledged / project.goal) * 100}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      />
                    </div>
                    <div className="progress-stats">
                      <span>${project.totalPledged.toLocaleString()} raised</span>
                      <span>{((project.totalPledged / project.goal) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                )}

                <div className="project-stats">
                  {project.status !== 'draft' ? (
                    <>
                      <div className="stat-item">
                        <i className="bi bi-people"></i>
                        <span>{project.backers} backers</span>
                      </div>
                      <div className="stat-item">
                        <i className="bi bi-clock"></i>
                        <span>
                          {project.daysLeft > 0 
                            ? `${project.daysLeft} days left` 
                            : project.daysLeft === 0 
                              ? 'Ended today'
                              : 'Ended'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="stat-item">
                      <i className="bi bi-pencil"></i>
                      <span>Draft saved</span>
                    </div>
                  )}
                </div>
              </Card.Body>
              <Card.Footer>
                <div className="card-footer-content">
                  <small className="text-muted">
                    {project.status === 'draft' 
                      ? `Last edited: ${new Date(project.lastUpdate).toLocaleDateString()}`
                      : `Launched: ${new Date(project.launchDate).toLocaleDateString()}`
                    }
                  </small>
                  <div className="button-group">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      className="me-2"
                    >
                      {project.status === 'draft' ? 'Edit Project' : 'View Dashboard'}
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                    >
                      Preview
                    </Button>
                  </div>
                </div>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Create Project Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Project Title</Form.Label>
              <Form.Control type="text" placeholder="Enter project title" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select>
                <option>Select a category</option>
                <option>Technology</option>
                <option>Art</option>
                <option>Fashion</option>
                <option>Publishing</option>
                <option>Games</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Project Description</Form.Label>
              <Form.Control as="textarea" rows={3} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Funding Goal</Form.Label>
              <Form.Control type="number" placeholder="Enter amount" />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setShowCreateModal(false)}>
            Create Project
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MyProjectsPage;