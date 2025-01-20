import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Nav } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './MyProjectsPage.css';
import placeholderImage from '../assets/image.png';  // Adjust the path according to your folder structure

const MyProjectsPage = () => {
  const [filter, setFilter] = useState('all');
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
    useEffect(() => {
      const fetchProjects = async () => {
        try {
          setIsLoading(true);
          const token = localStorage.getItem('accessToken');
          const response = await axios.get('/api/v1/projects/', {
            params: {
              status: filter !== 'all' ? filter : undefined
            },
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          setProjects(response.data.data.projects);
        } catch (error) {
          toast.error('Failed to fetch projects');
          console.error('Error fetching projects:', error);
        } finally {
          setIsLoading(false);
        }
      };
  
      fetchProjects();
    }, [filter]); // Only depends on filter now
  
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

  // const handleProjectAction = (projectId, status) => {
  //   if (status === 'draft') {
  //     navigate(`/projects/drafts/${projectId}`);
  //   } else {
  //     navigate(`/projects/${projectId}`);
  //   }
  // };

  const handleViewDetails = (project) => {
    if (project.status === 'DRAFT') {
      navigate(`/projects/drafts/${project.id}`);
    } else {
      navigate(`/projects/${project.id}`);
    }
  };
  
  const handleEditDraft = (projectId) => {
    navigate(`/projects/drafts/edit/${projectId}`);
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
        <Button 
          variant="primary" 
          onClick={() => navigate('/projects/create')}
        >
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

      {isLoading ? (
        <div className="text-center mt-4">Loading...</div>
      ) : (
        <Row className="project-grid">
          {projects.map((project) => (
            <Col md={4} key={project.id} className="mb-4">
              <Card className="project-card h-100">
              <Card.Img 
                variant="top" 
                src={project.image_url || placeholderImage} 
                style={{ height: '200px', objectFit: 'cover' }}  // This will maintain aspect ratio
              />
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
                          style={{ width: `${(project.total_pledged / project.goal_amount) * 100}%` }}
                          aria-valuenow={(project.total_pledged / project.goal_amount) * 100}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        />
                      </div>
                      <div className="progress-stats">
                        <span>${project.total_pledged?.toLocaleString()} raised</span>
                        <span>{((project.total_pledged / project.goal_amount) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}

                  <div className="project-stats">
                    {project.status !== 'draft' ? (
                      <>
                        <div className="stat-item">
                          <i className="bi bi-people"></i>
                          <span>{project.backers_count || 0} backers</span>
                        </div>
                        <div className="stat-item">
                          <i className="bi bi-clock"></i>
                          <span>{project.days_left > 0 ? `${project.days_left} days left` : 'Ended'}</span>
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
                        {project.status === 'DRAFT' 
                          ? `Last edited: ${new Date(project.updated_at).toLocaleDateString()}`
                          : `Launched: ${new Date(project.created_at).toLocaleDateString()}`
                        }
                      </small>
                      <div className="button-group">
                        {project.status === 'DRAFT' && (
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            className="me-2"
                            onClick={() => handleEditDraft(project.id)}
                          >
                            Edit Draft
                          </Button>
                        )}
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={() => handleViewDetails(project)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default MyProjectsPage;