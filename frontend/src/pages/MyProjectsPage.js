import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Nav, OverlayTrigger, Tooltip } from 'react-bootstrap';
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
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  // Fetch categories
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

  // Fetch projects
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

  const truncateText = (text, maxLength = 80) => {
    if (!text) return '';
    text = stripHtml(text);
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return !isNaN(date.getTime()) ? date.toLocaleDateString() : 'Not available';
  };

  const renderProjectCard = (project) => {
    const isDraft = project?.status?.toUpperCase() === 'DRAFT';
    const isPending = project?.status?.toLowerCase() === 'pending';
    const timeStatus = getProjectTimeStatus(project);
    const progress = calculateProgress(project.total_pledged || 0, project.goal_amount);

    return (
      <Col md={4} key={project.id} className="mb-4">
        <Card className="project-card h-100 shadow-sm">
          <div className="project-image-container">
            <Card.Img 
              variant="top" 
              src={getImageUrl(project)}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = placeholderImage;
              }}
            />
            <Badge 
              className={`status-badge ${getStatusBadgeClass(project.status)}`}
            >
              {project.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1).toLowerCase() : 'Unknown'}
            </Badge>
          </div>
          
          <Card.Body>
            <div className="category-label">
              {getCategoryName(project)}
            </div>
            
            <Card.Title className="project-title">
              {project.title || 'Untitled Project'}
            </Card.Title>
            
            <Card.Text className="project-brief">
              {truncateText(project.description || '')}
            </Card.Text>
            
            {!isDraft && !isPending && (
              <div className="funding-progress">
                <div className="progress">
                  <div 
                    className="progress-bar" 
                    role="progressbar"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="funding-stats">
                  <div className="funding-raised">
                    {formatCurrency(project.total_pledged || 0)}
                    <span className="funding-label">raised</span>
                  </div>
                  <div className="funding-percentage">
                    {progress.toFixed(0)}%
                  </div>
                </div>
              </div>
            )}
            
            <div className="project-meta">
              {!isDraft && !isPending ? (
                <>
                  <div className="meta-item backers">
                    <i className="bi bi-people"></i>
                    <span>{project.backers_count || 0}</span>
                  </div>
                  
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>{timeStatus}</Tooltip>}
                  >
                    <div className="meta-item time-status">
                      <i className="bi bi-clock"></i>
                      <span>{timeStatus.includes('days') ? timeStatus.replace(' days left', '') : '—'}</span>
                    </div>
                  </OverlayTrigger>
                  
                  <div className="meta-item goal">
                    <i className="bi bi-bullseye"></i>
                    <span>{formatCurrency(project.goal_amount || 0)}</span>
                  </div>
                </>
              ) : (
                <div className="meta-item draft-status">
                  <i className={isPending ? "bi bi-hourglass" : "bi bi-pencil"}></i>
                  <span>{isPending ? 'Pending Approval' : 'Draft'}</span>
                </div>
              )}
            </div>
          </Card.Body>
          
          <Card.Footer className="bg-white">
            <div className="card-footer-content">
              <small className="text-muted last-updated">
                {isDraft || isPending
                  ? `Updated: ${formatDate(project.updated_at || project.created_at)}`
                  : `Launched: ${formatDate(project.created_at)}`
                }
              </small>
              
              <div className="action-buttons">
                {isDraft && (
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    className="edit-button"
                    onClick={() => handleEditDraft(project.id)}
                  >
                    <i className="bi bi-pencil-fill me-1"></i>Edit
                  </Button>
                )}
                
                <Button 
                  variant={isDraft ? "light" : "outline-secondary"}
                  size="sm"
                  className="view-button"
                  onClick={() => handleViewDetails(project)}
                >
                  {isDraft ? "Preview" : "View"}
                </Button>
              </div>
            </div>
          </Card.Footer>
        </Card>
      </Col>
    );
  };

  return (
    <Container className="my-projects-page py-4">
      <div className="header-section mb-4">
        <div className="title-section">
          <h1 className="mb-0">My Projects</h1>
          <Badge bg="primary" className="project-count">
            {projects.length} Projects
          </Badge>
        </div>
        <Button 
          variant="primary" 
          className="create-button"
          onClick={() => navigate('/projects/create')}
        >
          <i className="bi bi-plus-lg me-2"></i> Create New Project
        </Button>
      </div>

      <Nav variant="tabs" className="project-tabs mb-4">
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
        <div className="text-center mt-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading your projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state text-center py-5">
          <i className="bi bi-clipboard-x empty-icon mb-3"></i>
          <h3>No projects found</h3>
          <p className="text-muted">
            {filter === 'all' 
              ? "You haven't created any projects yet." 
              : `You don't have any ${filter} projects.`}
          </p>
          <Button 
            variant="primary" 
            onClick={() => navigate('/projects/create')}
          >
            Create Your First Project
          </Button>
        </div>
      ) : (
        <Row className="project-grid">
          {projects.map(project => renderProjectCard(project))}
        </Row>
      )}
    </Container>
  );
};

export default MyProjectsPage;