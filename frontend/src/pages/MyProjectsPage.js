import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Nav } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './MyProjectsPage.css';
import * as projectService from '../services/projectService';
import placeholderImage from '../assets/image.png';

const MyProjectsPage = () => {
  const [filter, setFilter] = useState('all');
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState([]); // Add this state
  const navigate = useNavigate();

  const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const formatCurrency = (amount) => {
    const number = parseFloat(amount);
    return isNaN(number) ? "$0" : `$${number.toLocaleString()}`;
  };

  const calculateProgress = (raised, goal) => {
    const progress = (raised / goal) * 100;
    return isNaN(progress) ? 0 : Math.min(progress, 100);
  };

  // Add useEffect for fetching categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const result = await projectService.fetchCategories();
        if (result?.data) {
          setCategories(result.data);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

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
  }, [filter]);

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-success';
      case 'successful':
        return 'bg-primary';
      case 'draft':
        return 'bg-secondary';
      case 'pending':
        return 'bg-warning';
      default:
        return 'bg-danger';
    }
  };

  const handleViewDetails = (project) => {
    if (project?.status?.toUpperCase() === 'DRAFT') {
      navigate(`/projects/drafts/${project.id}`);
    } else {
      navigate(`/projects/${project.id}`);
    }
  };
  
  const handleEditDraft = (projectId) => {
    navigate(`/projects/drafts/edit/${projectId}`);
  };

  const getProjectTimeStatus = (project) => {
    if (project.status?.toLowerCase() === 'draft') {
      return 'Draft';
    }
    if (project.status?.toLowerCase() === 'pending') {
      return 'Awaiting Approval';
    }
    if (!project.start_date) {
      return 'Start date not set';
    }

    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);
    const now = new Date();

    if (now < startDate) {
      const daysToStart = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
      return `Starts in ${daysToStart} days`;
    }

    if (now > endDate) {
      return 'Ended';
    }

    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    return `${daysLeft} days left`;
  };

  const renderProjectCard = (project) => {
    const isDraft = project?.status?.toUpperCase() === 'DRAFT';
    const isPending = project?.status?.toLowerCase() === 'pending';
    const timeStatus = getProjectTimeStatus(project);

  
    // Format the date properly
    const formatDate = (dateString) => {
      if (!dateString) return 'Not available';
      const date = new Date(dateString);
      return !isNaN(date.getTime()) ? date.toLocaleDateString() : 'Not available';
    };

    // Get category name
    const getCategoryName = (project) => {
      if (!project) return 'Not set';
      return project.category?.name || 
            project.category_name || 
            categories.find(c => c.id === project.category_id)?.name || 
            'Not set';
    };

    const getImageUrl = (project) => {
      if (project.image_url) {
        // Check if it's already a full URL
        if (project.image_url.startsWith('http')) {
          return project.image_url;
        }
        // Add the correct API endpoint path
        return `${process.env.REACT_APP_BACKEND_URL}/api/v1/projects${project.image_url}`;
      }
      return placeholderImage;
    };

    // Show project details for both draft and non-draft projects
    const projectDetails = (
      <div className="project-details mt-3">
        <div className="mb-2">
          <strong>Goal Amount:</strong> {formatCurrency(project.goal_amount || 0)}
        </div>
        {project.start_date && (
          <div className="mb-2">
            <strong>Start Date:</strong> {new Date(project.start_date).toLocaleDateString()}
          </div>
        )}
        {project.end_date && (
          <div className="mb-2">
            <strong>End Date:</strong> {new Date(project.end_date).toLocaleDateString()}
          </div>
        )}
      </div>
    );

    return (
      <Col md={4} key={project.id} className="mb-4">
        <Card className="project-card h-100">
        <Card.Img 
          variant="top" 
          src={getImageUrl(project)}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = placeholderImage;
          }}
          style={{ height: '200px', objectFit: 'cover' }}
        />
          <Card.Body>
            <div className="card-header-content">
              <div>
                <Card.Title>{project.title || 'Untitled Project'}</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">
                {getCategoryName(project)}
                </Card.Subtitle>
              </div>
              <Badge className={getStatusBadgeClass(project.status)}>
                {project.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1).toLowerCase() : 'Unknown'}
              </Badge>
            </div>

            <Card.Text className="project-description">
              {stripHtml(project.description || '')}
            </Card.Text>

            {/* Show project details for all projects */}
            {projectDetails}

            {!isDraft && !isPending && (
              <div className="progress-section">
                <div className="progress">
                  <div 
                    className="progress-bar" 
                    role="progressbar"
                    style={{ 
                      width: `${calculateProgress(project.total_pledged || 0, project.goal_amount)}%` 
                    }}
                  />
                </div>
                <div className="progress-stats">
                  <span>{formatCurrency(project.total_pledged || 0)} raised</span>
                  <span>{calculateProgress(project.total_pledged || 0, project.goal_amount).toFixed(0)}%</span>
                </div>
              </div>
            )}

            <div className="project-stats">
              {!isDraft && !isPending ? (
                <>
                  <div className="stat-item">
                    <i className="bi bi-people"></i>
                    <span>{project.backers_count || 0} backers</span>
                  </div>
                  <div className="stat-item">
                    <i className="bi bi-clock"></i>
                    <span>{timeStatus}</span>
                  </div>
                </>
              ) : (
                <div className="stat-item">
                  <i className="bi bi-pencil"></i>
                  <span>{isPending ? 'Pending Approval' : 'Draft saved'}</span>
                </div>
              )}
            </div>
          </Card.Body>
          <Card.Footer>
            <div className="card-footer-content">
              <small className="text-muted">
                  {isDraft || isPending
                    ? `Last edited: ${formatDate(project.updated_at || project.created_at)}`
                    : `Launched: ${formatDate(project.created_at)}`
                  }
              </small>
              <div className="button-group">
                {isDraft && (
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
    );
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
            active={filter === 'pending'} 
            onClick={() => setFilter('pending')}
          >
            Pending
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
          {projects.map(project => renderProjectCard(project))}
        </Row>
      )}
    </Container>
  );
};

export default MyProjectsPage;