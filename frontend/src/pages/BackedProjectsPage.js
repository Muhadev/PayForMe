import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Nav, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
import { toast } from 'react-toastify';
import './BackedProjectsPage.css'; // We'll create this file later
import * as projectService from '../services/projectService';
import placeholderImage from '../assets/image.png';

const BackedProjectsPage = () => {
  const [filter, setFilter] = useState('all');
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 20,
    total: 0,
    pages: 1
  });
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

  useEffect(() => {
    const fetchBackedProjects = async () => {
      try {
        setIsLoading(true);
        
        const status = filter !== 'all' ? filter.toUpperCase() : undefined;
        
        const response = await projectService.fetchBackedProjects(
          'current',
          pagination.page, 
          pagination.perPage, 
          status
        );
        
        // Properly handle empty responses
        if (response && response.data) {
          // If data is directly an array
          if (Array.isArray(response.data)) {
            setProjects(response.data);
          } 
          // If data contains a projects property that is an array
          else if (response.data.projects && Array.isArray(response.data.projects)) {
            setProjects(response.data.projects);
          } 
          // Otherwise, ensure we set an empty array
          else {
            setProjects([]);
          }
          
          // Update pagination if meta data is available
          if (response.meta) {
            setPagination({
              ...pagination,
              total: response.meta.total || 0,
              pages: response.meta.pages || 1
            });
          }
        } else {
          // Fallback to empty array if response structure is unexpected
          setProjects([]);
        }
      } catch (error) {
        toast.error('Error fetching backed projects');
        console.error('Error fetching backed projects:', error);
        // Ensure projects is an empty array on error
        setProjects([]);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchBackedProjects();
  }, [filter, pagination.page, pagination.perPage]);
  
  const handlePageChange = (newPage) => {
    setPagination({
      ...pagination,
      page: newPage
    });
  };

  const stripHtml = (html) => {
    if (!html) return '';
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

  const handleViewDetails = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const getProjectTimeStatus = (project) => {
    if (!project.start_date) {
      return 'No timeline';
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
    const timeStatus = getProjectTimeStatus(project);
    const progress = calculateProgress(project.total_pledged || 0, project.goal_amount);
    const yourContribution = formatCurrency(project.total_amount || 0);

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
            
            <div className="your-contribution mt-3">
              <Badge bg="info" className="p-2">
                Your contribution: {yourContribution}
              </Badge>
            </div>
            
            <div className="project-meta mt-3">
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
            </div>
          </Card.Body>
          
          <Card.Footer className="bg-white">
            <div className="card-footer-content">
              <small className="text-muted">
                Backed on: {formatDate(project.first_backed_at)}
              </small>
              
              <div className="action-buttons">
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  className="view-button"
                  onClick={() => handleViewDetails(project.id)}
                >
                  View Project
                </Button>
              </div>
            </div>
          </Card.Footer>
        </Card>
      </Col>
    );
  };

  // Pagination component
  const renderPagination = () => {
    if (pagination.pages <= 1) return null;
    
    const pageNumbers = [];
    for (let i = 1; i <= pagination.pages; i++) {
      pageNumbers.push(i);
    }
    
    return (
      <nav className="d-flex justify-content-center mt-4">
        <ul className="pagination">
          <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
            <button 
              className="page-link"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </button>
          </li>
          
          {pageNumbers.map(number => (
            <li 
              key={number} 
              className={`page-item ${pagination.page === number ? 'active' : ''}`}
            >
              <button
                className="page-link"
                onClick={() => handlePageChange(number)}
              >
                {number}
              </button>
            </li>
          ))}
          
          <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
            <button 
              className="page-link"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
            >
              Next
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  return (
    <Container className="backed-projects-page py-4">
      <div className="header-section mb-4">
        <div className="title-section">
          <h1 className="mb-0">Backed Projects</h1>
          <Badge bg="primary" className="project-count">
            {pagination.total} Projects
          </Badge>
        </div>
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
            active={filter === 'failed'} 
            onClick={() => setFilter('failed')}
          >
            Failed
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {isLoading ? (
        <div className="text-center mt-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading your backed projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state text-center py-5">
          <i className="bi bi-heart empty-icon mb-3"></i>
          <h3>No backed projects found</h3>
          <p className="text-muted">
            {filter === 'all' 
              ? "You haven't backed any projects yet." 
              : `You don't have any ${filter} backed projects.`}
          </p>
          <Button 
            variant="primary" 
            onClick={() => navigate('/')}
          >
            Discover Projects
          </Button>
        </div>
      ) : (
        <>
          <Row className="project-grid">
            {projects.map(project => renderProjectCard(project))}
          </Row>
          {renderPagination()}
        </>
      )}
    </Container>
  );
};

export default BackedProjectsPage;