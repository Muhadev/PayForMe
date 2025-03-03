import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner, Pagination, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faTrash, faSearch } from '@fortawesome/free-solid-svg-icons';
import { getSavedProjects, unsaveProject } from '../services/projectService';
import { Link, useNavigate } from 'react-router-dom';
import placeholderImage from '../assets/image.png';
import './SavedProjectsPage.css';
import * as backerService from '../services/backerService';

const SavedProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();

  // Add these helper functions at the top of the component
  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const truncateText = (text, maxLength = 80) => {
    if (!text) return '';
    text = stripHtml(text);
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  useEffect(() => {
    const fetchSavedProjects = async () => {
      try {
        setLoading(true);
        const response = await getSavedProjects(currentPage);
        setProjects(response.data.projects);
        setTotalPages(response.data.pages);
        setError(null);
      } catch (err) {
        setError('Failed to load saved projects. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedProjects();
  }, [currentPage, refreshTrigger]);

    // Add this new effect to fetch backer stats
    useEffect(() => {
      const fetchBackerStatsForProjects = async () => {
        if (!projects.length) return;
        
        // Filter active projects that need stats
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
                current_amount: result.data.total_amount || project.total_pledged || 0
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
  
      if (projects.length && !loading) {
        fetchBackerStatsForProjects();
      }
    }, [projects.length, loading]);

  const handleUnsave = async (projectId) => {
    try {
      await unsaveProject(projectId);
      // Update the local state to remove the unsaved project
      setProjects(projects.filter(project => project.id !== projectId));
    } catch (err) {
      console.error('Error unsaving project:', err);
      setError('Failed to unsave project. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    const number = parseFloat(amount);
    return isNaN(number) ? "$0" : `$${number.toLocaleString()}`;
  };

  const calculateProgress = (raised, goal) => {
    if (!raised || !goal) return 0;
    const progress = (raised / goal) * 100;
    return isNaN(progress) ? 0 : Math.min(progress, 100);
  };

  const getImageUrl = (project) => {
    if (project.image_url) {
      // Check if it's already a full URL
      if (project.image_url.startsWith('http')) {
        return project.image_url;
      }
      // Add the correct API endpoint path if needed
      return process.env.REACT_APP_BACKEND_URL ? 
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/projects${project.image_url}` : 
        project.image_url;
    }
    return placeholderImage;
  };

  const getProjectTimeStatus = (project) => {
    if (!project.end_date) return 'No timeline';
    
    const endDate = new Date(project.end_date);
    const now = new Date();
    
    if (now > endDate) {
      return 'Ended';
    }
    
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    return `${daysLeft} days left`;
  };
  
  const formatSavedDate = (project) => {
    // First try to use saved_at, then fall back to created_at if saved_at doesn't exist
    const dateString = project.saved_at || project.created_at;
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return !isNaN(date.getTime()) ? date.toLocaleDateString() : 'Unknown date';
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    let items = [];
    for (let number = 1; number <= totalPages; number++) {
      items.push(
        <Pagination.Item 
          key={number} 
          active={number === currentPage}
          onClick={() => setCurrentPage(number)}
        >
          {number}
        </Pagination.Item>
      );
    }

    return (
      <Pagination className="justify-content-center mt-4">
        <Pagination.Prev 
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1} 
        />
        {items}
        <Pagination.Next 
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages} 
        />
      </Pagination>
    );
  };

  const renderProjectCard = (project) => {
    // Normalize property names to handle different API response formats
    const normalizedProject = {
      id: project.id,
      title: project.title || 'Unnamed Project',
      category: project.categories?.name || project.category_name || project.category || 'Uncategorized',
      short_description: stripHtml(project.short_description || project.description || ''),
      current_amount: parseFloat(project.current_amount || project.total_pledged || 0),
      funding_goal: parseFloat(project.funding_goal || project.goal_amount || 0),
      backers_count: project.backers_count || 0,
      days_left: project.days_left,
      end_date: project.end_date,
      image_url: project.image_url,
      saved_at: project.saved_at
    };
    
    const progress = calculateProgress(normalizedProject.current_amount, normalizedProject.funding_goal);
    const timeStatus = getProjectTimeStatus(normalizedProject);
  
    return (
      <Col md={4} key={normalizedProject.id} className="mb-4">
        <Card className="project-card h-100 shadow-sm">
          <div className="project-image-container">
            <Card.Img 
              variant="top" 
              src={getImageUrl(normalizedProject)} 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = placeholderImage;
              }}
            />
            <Badge className="status-badge bg-success">
              Saved
            </Badge>
          </div>
          
          <Card.Body className="pt-2 pb-2"> {/* Reduced padding */}
            <div className="category-label">
              {normalizedProject.category}
            </div>
            
            <Card.Title className="project-title">
              {normalizedProject.title}
            </Card.Title>
            
            <Card.Text className="project-brief mb-2"> {/* Reduced margin */}
              {truncateText(normalizedProject.short_description, 100)} {/* Reduced character count */}
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
                  {formatCurrency(normalizedProject.current_amount)}
                  <span className="funding-label">raised</span>
                </div>
                <div className="funding-percentage">
                  {progress.toFixed(0)}%
                </div>
              </div>
            </div>
            
            <div className="project-meta">
              <div className="meta-item backers">
                <i className="bi bi-people"></i>
                <span>{normalizedProject.backers_count}</span>
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
                <span>{formatCurrency(normalizedProject.funding_goal)}</span>
              </div>
            </div>
          </Card.Body>
          
          <Card.Footer className="bg-white py-2"> {/* Reduced padding */}
            <div className="card-footer-content">
              <small className="text-muted last-updated">
                Saved: {formatSavedDate(normalizedProject)}
              </small>
              
              <div className="action-buttons">
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  className="unsave-button py-0 px-2"
                  onClick={() => handleUnsave(normalizedProject.id)}
                >
                  <i className="bi bi-heart-fill me-1"></i>Unsave
                </Button>
                
                <Link to={`/projects/${normalizedProject.id}`}>
                  <Button 
                    variant="outline-secondary"
                    size="sm"
                    className="view-button py-0 px-2"
                  >
                    View
                  </Button>
                </Link>
              </div>
            </div>
          </Card.Footer>
        </Card>
      </Col>
    );
  };

  return (
    <Container className="saved-projects-page py-4">
      <div className="header-section mb-4">
        <div className="title-section">
          <h1 className="mb-0">Saved Projects</h1>
          <Badge bg="primary" className="project-count">
            {projects.length} Saved
          </Badge>
        </div>
        {/* <Button 
          variant="primary" 
          className="discover-button"
          onClick={() => navigate('/discover')}
        >
          <FontAwesomeIcon icon={faSearch} className="me-2" /> Discover Projects
        </Button> */}
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {loading ? (
        <div className="text-center mt-4">
          <Spinner animation="border" role="status" className="text-primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading your saved projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state text-center py-5">
          <i className="bi bi-heart empty-icon mb-3"></i>
          <h3>No saved projects</h3>
          <p className="text-muted">
            You haven't saved any projects yet. Browse projects and click the heart icon to save them for later.
          </p>
          {/* <Button 
            variant="primary" 
            onClick={() => navigate('/discover')}
          >
            Discover Projects
          </Button> */}
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

export default SavedProjectsPage;