import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../helper/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FaBookmark, FaRegBookmark, FaSearch } from 'react-icons/fa';
import './ExploreProjectsPage.css';
import * as backerService from '../services/backerService';

function ExploreProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [savedProjects, setSavedProjects] = useState([]);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Helper functions for text and image handling
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
    return null; // Will use the default image div instead
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
    if (!project.end_date) {
      return 'No timeline';
    }
    
    const endDate = new Date(project.end_date);
    const now = new Date();
    
    if (now > endDate) {
      return 'Ended';
    }
    
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    return `${daysLeft} days left`;
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

  // Get status badge class based on status
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

  // Fetch projects with search and filter
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        if (searchQuery) params.append('q', searchQuery);
        if (selectedCategory) params.append('category_id', selectedCategory);
        
        const response = await axiosInstance.get(`/api/v1/projects/search?${params.toString()}`);
        
        if (response.data.data && response.data.data.projects) {
          console.log('Project data sample:', response.data.data.projects[0]); // Log the first project to debug
          setProjects(response.data.data.projects);
        } else {
          setProjects([]);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setError('Failed to load projects. Please try again later.');
        toast.error('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [searchQuery, selectedCategory]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axiosInstance.get('/api/v1/categories');
        if (response.data.data && response.data.data.categories) {
          setCategories(response.data.data.categories);
        } else {
          console.warn('Categories data format unexpected:', response.data);
          setCategories([]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  // Fetch saved projects for authenticated users
  useEffect(() => {
    const fetchSavedProjects = async () => {
      if (!isAuthenticated) {
        setSavedProjects([]);
        return;
      }
      
      try {
        const response = await axiosInstance.get('/api/v1/projects/saved');
        if (response.data.data && response.data.data.projects) {
          // Create an array of saved project IDs for easier checking
          const savedIds = response.data.data.projects.map(project => project.id);
          setSavedProjects(savedIds);
        }
      } catch (error) {
        console.error('Error fetching saved projects:', error);
      }
    };

    fetchSavedProjects();
  }, [isAuthenticated]);

  // Improved backer stats fetching for projects
  useEffect(() => {
    const fetchBackerStatsForProjects = async () => {
      if (!projects.length || loading) return;
      
      // Filter active projects that need stats
      const projectsNeedingStats = projects.filter(
        project => project.status?.toLowerCase() !== 'draft' && 
                   project.status?.toLowerCase() !== 'pending' &&
                   project.status?.toLowerCase() !== 'revoked'
      );
      
      if (!projectsNeedingStats.length) return;
      
      try {
        // Create temporary array of promises to fetch backer stats
        const statsPromises = projectsNeedingStats.map(project => 
          backerService.fetchBackerStats(project.id)
        );
        
        // Execute all promises in parallel
        const statsResults = await Promise.all(statsPromises);
        
        // Create a map of project IDs to stats for easier lookup
        const statsMap = {};
        projectsNeedingStats.forEach((project, index) => {
          const result = statsResults[index];
          if (!result.error && result.data) {
            statsMap[project.id] = {
              backers_count: result.data.total_backers || 0,
              total_pledged: result.data.total_amount || 0
            };
          }
        });
        
        // Update projects with stats data
        const updatedProjects = projects.map(project => {
          if (statsMap[project.id]) {
            return { ...project, ...statsMap[project.id] };
          }
          return project;
        });
        
        console.log('Updated projects with stats:', updatedProjects[0]); // Log the first updated project
        setProjects(updatedProjects);
      } catch (error) {
        console.error('Failed to fetch backer stats:', error);
      }
    };
  
    if (projects.length && !loading) {
      fetchBackerStatsForProjects();
    }
  }, [projects.length, loading]);

  const handleSearch = (e) => {
    e.preventDefault();
    // The search happens through the useEffect when searchQuery changes
  };

  const handleSaveProject = async (projectId, isSaved) => {
    if (!isAuthenticated) {
      // Redirect to login with intended destination
      navigate('/signin', { state: { from: '/projects/explore' } });
      return;
    }
    
    try {
      if (isSaved) {
        // Unsave project
        await axiosInstance.delete(`/api/v1/projects/${projectId}/save`);
        setSavedProjects(savedProjects.filter(id => id !== projectId));
        toast.success('Project removed from saved list');
      } else {
        // Save project
        await axiosInstance.post(`/api/v1/projects/${projectId}/save`);
        setSavedProjects([...savedProjects, projectId]);
        toast.success('Project saved to your list');
      }
    } catch (error) {
      console.error('Error saving/unsaving project:', error);
      toast.error('Failed to update saved projects');
    }
  };

  const handleBackProject = (projectId) => {
    if (!isAuthenticated) {
      // Redirect to login with intended destination
      navigate('/signin', { state: { from: `/projects/${projectId}` } });
      return;
    }
    
    // Navigate to project details for backing
    navigate(`/projects/${projectId}`);
  };

  // Render project card
  const renderProjectCard = (project) => {
    const isSaved = savedProjects.includes(project.id);
    const isDraft = project.status?.toLowerCase() === 'draft';
    const isPending = project.status?.toLowerCase() === 'pending';
    const isRevoked = project.status?.toLowerCase() === 'revoked';
    
    // Determine category
    const category = project.categories?.name || 
                    project.category_name || 
                    project.category || 
                    categories.find(c => c.id === project.category_id)?.name || 
                    'Uncategorized';
    
    // Calculate funding data
    const fundingGoal = parseFloat(project.funding_goal || project.goal_amount || 0);
    const raisedAmount = parseFloat(project.total_pledged || project.current_amount || 0);
    const progress = calculateProgress(raisedAmount, fundingGoal);
    const timeStatus = getProjectTimeStatus(project);
    
    return (
      <Col key={project.id} md={4} sm={6} className="mb-4">
        <Card className="project-card h-100 shadow-sm">
          {/* Project Image */}
          <div className="position-relative">
            {project.image_url ? (
              <Card.Img 
                variant="top" 
                src={getImageUrl(project)} 
                alt={project.title}
                className="project-image"
                onError={(e) => {
                  e.target.onerror = null;
                  // Create a fallback div that maintains the same dimensions
                  const cardContainer = e.target.closest('.position-relative');
                  if (cardContainer) {
                    // Hide the image
                    e.target.style.display = 'none';
                    
                    // Create fallback div with same dimensions as image
                    const fallbackDiv = document.createElement('div');
                    fallbackDiv.className = 'default-project-image';
                    fallbackDiv.style.height = '200px'; // Set to match standard card image height
                    fallbackDiv.innerHTML = `<span>${project.title.charAt(0)}</span>`;
                    
                    // Insert fallback before the img element
                    cardContainer.insertBefore(fallbackDiv, e.target);
                  }
                }}
              />
            ) : (
              <div className="default-project-image">
                <span>{project.title.charAt(0)}</span>
              </div>
            )}
            
            {/* Status badge */}
            {project.status && (
              <Badge 
                bg={getStatusBadgeClass(project.status)}
                className="status-badge"
              >
                {project.status.charAt(0).toUpperCase() + project.status.slice(1).toLowerCase()}
              </Badge>
            )}
          </div>
          
          <Card.Body className="pt-2 pb-2">
            <div className="d-flex justify-content-between">
              <div className="category-label">
                {category}
              </div>
              
              {isAuthenticated && (
                <Button 
                  variant="link" 
                  className={`bookmark-btn ${isSaved ? 'saved' : ''}`}
                  onClick={() => handleSaveProject(project.id, isSaved)}
                >
                  {isSaved ? <FaBookmark /> : <FaRegBookmark />}
                </Button>
              )}
            </div>
            
            <Card.Title className="project-title">
              {project.title || 'Unnamed Project'}
            </Card.Title>
            
            <Card.Text className="project-brief mb-2">
              {truncateText(project.description || project.short_description || '', 100)}
            </Card.Text>
            
            {/* Only show funding progress for non-draft, non-pending projects */}
            {!isDraft && !isPending && !isRevoked && (
              <div className="funding-progress">
                <div className="progress">
                  <div 
                    className="progress-bar" 
                    role="progressbar"
                    style={{ width: `${progress}%` }}
                    aria-valuenow={progress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  />
                </div>
                <div className="funding-stats">
                  <div className="funding-raised">
                    {formatCurrency(raisedAmount)}
                    <span className="funding-label">raised</span>
                  </div>
                  <div className="funding-percentage">
                    {progress.toFixed(0)}%
                  </div>
                </div>
              </div>
            )}
            
            {/* Project Meta Stats */}
            <div className="project-meta">
              {isRevoked ? (
                <div className="meta-item revoked-status">
                  <i className="bi bi-x-circle-fill"></i>
                  <span>Revoked</span>
                </div>
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
                    <span>{formatCurrency(fundingGoal)}</span>
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
          
          <Card.Footer className="bg-white py-2">
            <div className="card-footer-content">
              <Link to={`/projects/${project.id}`} className="w-100">
                <Button 
                  variant="outline-primary"
                  size="sm"
                  className="view-button w-100"
                >
                  View Project
                </Button>
              </Link>
            </div>
          </Card.Footer>
        </Card>
      </Col>
    );
  };

  if (loading) {
    return (
      <Container className="mt-5">
        <h1 className="mb-4">Explore Projects</h1>
        <LoadingSpinner />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <h1 className="mb-4">Explore Projects</h1>
        <div className="alert alert-danger">{error}</div>
        <Button onClick={() => window.location.reload()} variant="primary">
          Try Again
        </Button>
      </Container>
    );
  }

  return (
    <Container className="mt-5 mb-5 explore-projects">
      <div className="header-section mb-4">
        <div className="title-section">
          <h1 className="mb-0">Explore Projects</h1>
          <Badge bg="primary" className="project-count">
            {projects.length} Projects
          </Badge>
        </div>
      </div>
      
      <Form onSubmit={handleSearch} className="mb-4 search-form">
        <Row>
          <Col md={6}>
            <Form.Group className="search-input-group">
              <FaSearch className="search-icon" />
              <Form.Control
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-select"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={2}>
            <Button type="submit" variant="primary" className="w-100 search-button">
              Search
            </Button>
          </Col>
        </Row>
      </Form>

      {!isAuthenticated && (
        <div className="auth-banner mb-4">
          <p>
            <Link to="/signin" className="signin-link">Sign in</Link> to create your own project or save projects you're interested in!
          </p>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center my-5 no-projects">
          <h3>No projects found matching your criteria</h3>
          <p>Try adjusting your search or browse all available projects</p>
          {isAuthenticated && (
            <Link to="/projects/create" className="btn btn-primary mt-3">
              Create Your Own Project
            </Link>
          )}
        </div>
      ) : (
        <Row className="project-grid">
          {projects.map(project => renderProjectCard(project))}
        </Row>
      )}
    </Container>
  );
}

export default ExploreProjectsPage;