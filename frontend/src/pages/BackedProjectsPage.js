// BackedProjectsPage.js
import React, { useState } from 'react';
import { Container, Row, Col, Card, Badge, Button, Nav } from 'react-bootstrap';
import './BackedProjectsPage.css';

const BackedProjectsPage = () => {
  const [filter, setFilter] = useState('all');
  
  const projects = [
    {
      id: 1,
      title: "Eco-Friendly Water Bottle",
      creator: "GreenLife Products",
      imageUrl: "https://via.placeholder.com/400x200",
      pledged: 50,
      totalPledged: 15000,
      goal: 20000,
      backers: 350,
      daysLeft: 15,
      status: "active",
      category: "Eco",
      lastUpdate: "2024-01-05"
    },
    {
      id: 2,
      title: "Smart Home Security System",
      creator: "TechDefend",
      imageUrl: "https://via.placeholder.com/400x200",
      pledged: 150,
      totalPledged: 50000,
      goal: 45000,
      backers: 800,
      daysLeft: 0,
      status: "successful",
      category: "Technology",
      lastUpdate: "2024-01-08"
    },
    {
      id: 3,
      title: "Indie Documentary Series",
      creator: "FilmCollective",
      imageUrl: "https://via.placeholder.com/400x200",
      pledged: 75,
      totalPledged: 8000,
      goal: 25000,
      backers: 200,
      daysLeft: -5,
      status: "cancelled",
      category: "Film",
      lastUpdate: "2024-01-01"
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
      case 'cancelled':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <Container className="backed-projects-page">
      <div className="header-section">
        <h1>My Backed Projects</h1>
        <Badge bg="primary" className="project-count">
          {projects.length} Projects
        </Badge>
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
        <Nav.Item>
          <Nav.Link 
            active={filter === 'cancelled'} 
            onClick={() => setFilter('cancelled')}
          >
            Cancelled
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
                      by {project.creator}
                    </Card.Subtitle>
                  </div>
                  <Badge className={getStatusBadgeClass(project.status)}>
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </Badge>
                </div>

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

                <div className="project-stats">
                  <div className="stat-item">
                    <i className="bi bi-cash"></i>
                    <span>Pledged ${project.pledged}</span>
                  </div>
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
                </div>
              </Card.Body>
              <Card.Footer>
                <div className="card-footer-content">
                  <small className="text-muted">
                    Last updated: {new Date(project.lastUpdate).toLocaleDateString()}
                  </small>
                  <Button variant="link" className="view-details-btn">
                    View Details <i className="bi bi-chevron-right"></i>
                  </Button>
                </div>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default BackedProjectsPage;