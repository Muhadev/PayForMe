import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Nav, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './MyProjectsPage.css';
import * as projectService from '../services/projectService';
import placeholderImage from '../assets/image.png';
import * as backerService from '../services/backerService';
import ProjectFilterTabs from './ProjectFilterTabs';

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
            my_projects: true,  // Add this parameter
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

  // More efficient implementation using Promise.all
  useEffect(() => {
    const fetchBackerStatsForProjects = async () => {
      if (!projects.length) return;
      
      // Filter projects that need stats (non-draft, non-pending)
      const projectsNeedingStats = projects.filter(
        project => project.status?.toLowerCase() !== 'draft' && 
                    project.status?.toLowerCase() !== 'pending' &&
                    project.status?.toLowerCase() !== 'revoked'
      );
      
      if (!projectsNeedingStats.length) return;
      
      try {
        // Create array of promises for parallel execution
        const statsPromises = projectsNeedingStats.map(project => 
          backerService.fetchBackerStats(project.id)
        );
        
        // Execute all promises in parallel
        const statsResults = await Promise.all(statsPromises);
        
        // Create a map of project ID to stats
        const statsMap = {};
        projectsNeedingStats.forEach((project, index) => {
          const result = statsResults[index];
          if (!result.error && result.data) {
            statsMap[project.id] = {
              backers_count: result.data.total_backers || 0,
              total_pledged: result.data.total_amount || project.total_pledged || 0
            };
          }
        });
        
        // Update all projects with their stats
        const updatedProjects = projects.map(project => {
          if (statsMap[project.id]) {
            return { ...project, ...statsMap[project.id] };
          }
          return project;
        });
        
        setProjects(updatedProjects);
      } catch (error) {
        console.error('Failed to fetch backer stats:', error);
      }
    };

    if (projects.length && !isLoading) {
      fetchBackerStatsForProjects();
    }
  }, [projects.length, isLoading]);

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
    if (project.status?.toLowerCase() === 'revoked') {
      return 'Revoked';
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
    const isRevoked = project?.status?.toLowerCase() === 'revoked';
    const timeStatus = getProjectTimeStatus(project);
    const progress = calculateProgress(project.total_pledged || 0, project.goal_amount);

    return (
      <Col md={4} key={project.id} className="mb-4">
        <Card className={`project-card h-100 shadow-sm ${isRevoked ? 'revoked-project' : ''}`}>
          <div className="position-relative">
            <Card.Img 
              variant="top" 
              src={getImageUrl(project)}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = placeholderImage;
              }}
              className={isRevoked ? 'grayscale-img' : ''}
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
            
            {!isDraft && !isPending && !isRevoked &&(
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
            {isRevoked ? (
              <>
                <div className="meta-item revoked-status">
                  <i className="bi bi-x-circle-fill"></i>
                  <span>Revoked</span>
                  {project.revocation_date && (
                    <small className="revoked-date">
                      on {formatDate(project.revocation_date)}
                    </small>
                  )}
                </div>
                
                {/* Add the revocation reason tooltip here */}
                {project.revocation_reason && (
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip id={`tooltip-${project.id}`}>
                      {project.revocation_reason}
                    </Tooltip>}
                  >
                    <div className="revocation-reason-hint mt-2">
                      <i className="bi bi-info-circle me-1"></i>
                      <small>Hover for revocation details</small>
                    </div>
                  </OverlayTrigger>
                )}
              </>
          
            ) : !isDraft && !isPending ? (
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
                {isRevoked
                  ? `Revoked: ${formatDate(project.updated_at || project.created_at)}`
                :isDraft || isPending
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
      <ProjectFilterTabs activeFilter={filter} setFilter={setFilter} />

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