import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faChartLine, faHeart, faBell } from '@fortawesome/free-solid-svg-icons';
import './UserDashboardPage.css';
import { Link, useNavigate } from 'react-router-dom';
import placeholderImage from '../assets/image.png';
import { toast } from 'react-toastify';
import Sidebar from './Sidebar';
import { fetchCategories, api } from '../services/projectService';
import RecentActivityNotifications from './RecentActivityNotifications';
import * as backerService from '../services/backerService';

const StatsCard = ({ icon, title, value, color }) => (
  <Card className="text-center">
    <Card.Body>
      <FontAwesomeIcon icon={icon} size="2x" className={`mb-2 text-${color}`} />
      <h5>{title}</h5>
      <h3>{value}</h3>
    </Card.Body>
  </Card>
);

const ProjectsList = ({ projects, isLoading }) => {
  const navigate = useNavigate();
  
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

  const formatCurrency = (amount) => {
    const number = parseFloat(amount);
    return isNaN(number) ? "$0" : `$${number.toLocaleString()}`;
  };

  const calculateProgress = (raised, goal) => {
    const progress = (raised / goal) * 100;
    return isNaN(progress) ? 0 : Math.min(progress, 100);
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
    
    // Remove HTML tags if present
    const tmp = document.createElement('div');
    tmp.innerHTML = text;
    const plainText = tmp.textContent || tmp.innerText || '';
    
    if (plainText.length <= maxLength) return plainText;
    return plainText.substr(0, maxLength) + '...';
  };

  const handleViewDetails = (project) => {
    if (project?.status?.toUpperCase() === 'DRAFT') {
      navigate(`/projects/drafts/${project.id}`);
    } else {
      navigate(`/projects/${project.id}`);
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">My Latest Projects</h5>
          <Link to="/projects/create">
            <Button variant="primary" size="sm">
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Create New Project
            </Button>
          </Link>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading your projects...</p>
        </Card.Body>
      </Card>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">My Latest Projects</h5>
          <Link to="/projects/create">
            <Button variant="primary" size="sm">
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Create New Project
            </Button>
          </Link>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <div className="empty-state">
            <i className="bi bi-clipboard-x empty-icon mb-3"></i>
            <h4>No projects yet</h4>
            <p className="text-muted mb-4">You haven't created any projects yet</p>
            <Link to="/projects/create">
              <Button variant="primary">
                <FontAwesomeIcon icon={faPlus} className="me-2" />
                Create Your First Project
              </Button>
            </Link>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">My Latest Projects</h5>
        <Link to="/projects/create">
          <Button variant="primary" size="sm">
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Create New Project
          </Button>
        </Link>
      </Card.Header>
      <Card.Body>
        <Row>
          {projects.map((project) => (
            <Col md={4} key={project.id} className="mb-3">
              <Card className="project-card h-100 shadow-sm">
                <div className="project-image-container">
                  <Card.Img 
                    variant="top" 
                    src={getImageUrl(project)}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = placeholderImage;
                    }}
                    style={{ height: '200px', objectFit: 'cover' }}
                  />
                  <div className={`status-badge ${getStatusBadgeClass(project.status)}`}>
                    {project.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1).toLowerCase() : 'Unknown'}
                  </div>
                </div>
                
                <Card.Body>
                  <div className="category-label">
                    {project.category?.name || 'Uncategorized'}
                  </div>
                  
                  <Card.Title className="project-title">
                    {project.title || 'Untitled Project'}
                  </Card.Title>
                  
                  <Card.Text className="project-brief">
                    {truncateText(project.description || '')}
                  </Card.Text>
                  
                  {project.status?.toLowerCase() !== 'draft' && project.status?.toLowerCase() !== 'pending' && (
                    <div className="funding-progress">
                      <div className="progress">
                        <div 
                          className="progress-bar" 
                          role="progressbar"
                          style={{ width: `${calculateProgress(project.total_pledged || 0, project.goal_amount)}%` }}
                        />
                      </div>
                      <div className="project-meta mt-2">
                      <div className="meta-item backers">
                        <i className="bi bi-people"></i>
                        <span>{project.backers_count || 0} backers</span>
                      </div>
                    </div>
                      <div className="funding-stats">
                        <div className="funding-raised">
                          {formatCurrency(project.total_pledged || 0)}
                          <span className="funding-label">raised</span>
                        </div>
                        <div className="funding-percentage">
                          {calculateProgress(project.total_pledged || 0, project.goal_amount).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  )}
                </Card.Body>
                <Card.Footer className="bg-white">
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    onClick={() => handleViewDetails(project)}
                    className="w-100"
                  >
                    View Details
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
        {/* {projects.length > 0 && (
          <div className="text-center mt-3">
            <Link to="/projects">
              <Button variant="outline-secondary" size="sm">
                View All My Projects
              </Button>
            </Link>
          </div>
        )} */}
      </Card.Body>
    </Card>
  );
};

const RecentActivity = () => (
  <Card>
    <Card.Header>
      <h5 className="mb-0">Recent Activity</h5>
    </Card.Header>
    <Card.Body>
      <ul className="list-unstyled">
        {[1, 2, 3].map((activity) => (
          <li key={activity} className="mb-3">
            <div className="d-flex align-items-center">
              <FontAwesomeIcon icon={faBell} className="me-3 text-primary" />
              <div>
                <strong>New donation received</strong>
                <p className="mb-0 text-muted">John Smith donated $50 to your project "Save the Whales"</p>
                <small className="text-muted">2 hours ago</small>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card.Body>
  </Card>
);

const UserDashboardPage = () => {
  const [userProjects, setUserProjects] = useState([]);
  const [stats, setStats] = useState({
    totalRaised: 0,
    projectsCreated: 0,
    projectsBacked: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch user profile first to get accurate counts
        const profileResponse = await api.get('/api/v1/profile/');
        const profileData = profileResponse.data.data.user;
        
        setStats({
          totalRaised: profileData.total_donations || 0,
          projectsCreated: profileData.projects_created_count || 0,
          projectsBacked: profileData.backed_projects_count || 0
        });
      } catch (error) {
        console.error('Error fetching user profile data:', error);
        toast.error('Failed to load user profile data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchProjectsAndCategories = async () => {
      try {
        setIsProjectsLoading(true);
        
        // Fetch categories first
        const categoriesResponse = await fetchCategories();
        const categories = categoriesResponse.data || [];
        
        // Map categories by ID for easy lookup
        const categoriesMap = categories.reduce((map, category) => {
          map[category.id] = category;
          return map;
        }, {});
        
        // Fetch projects
        const projectsResponse = await api.get('/api/v1/projects/', {
          params: {
            my_projects: true,
            per_page: 3,
            sort_by: 'created_at',
            sort_order: 'desc'
          }
        });
        
        // Enhance projects with full category objects
        const projects = projectsResponse.data.data.projects || [];
        const enhancedProjects = projects.map(project => {
          if (project.category_id && categoriesMap[project.category_id]) {
            return {
              ...project,
              category: categoriesMap[project.category_id]
            };
          }
          return project;
        });
        
        setUserProjects(enhancedProjects);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load your projects');
      } finally {
        setIsProjectsLoading(false);
      }
    };
    
    fetchProjectsAndCategories();
  }, []);

  // Add this new effect to fetch backer stats
  useEffect(() => {
    const fetchBackerStatsForProjects = async () => {
      if (!userProjects.length) return;
      
      // Filter active projects that need stats
      const projectsNeedingStats = userProjects.filter(
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
              current_amount: result.data.total_amount || 0
            };
          }
        });
        
        // Update all projects with their stats
        const updatedProjects = userProjects.map(project => {
          if (statsMap[project.id]) {
            return { 
              ...project, 
              backers_count: statsMap[project.id].backers_count,
              total_pledged: statsMap[project.id].current_amount || project.total_pledged
            };
          }
          return project;
        });
        
        setUserProjects(updatedProjects);
      } catch (error) {
        console.error('Failed to fetch backer stats:', error);
      }
    };
  
    if (userProjects.length && !isProjectsLoading) {
      fetchBackerStatsForProjects();
    }
  }, [userProjects.length, isProjectsLoading]);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Container fluid>
          {isLoading ? (
            <div className="text-center p-5">
              <Spinner animation="border" variant="primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : (
            <>
              <Row className="mb-4">
                <Col md={4}>
                  <StatsCard 
                    icon={faChartLine} 
                    title="Total Raised" 
                    value={`$${stats.totalRaised.toLocaleString()}`} 
                    color="primary" 
                  />
                </Col>
                <Col md={4}>
                  <StatsCard 
                    icon={faPlus} 
                    title="Projects Created" 
                    value={stats.projectsCreated} 
                    color="success" 
                  />
                </Col>
                <Col md={4}>
                  <StatsCard 
                    icon={faHeart} 
                    title="Projects Backed" 
                    value={stats.projectsBacked} 
                    color="danger" 
                  />
                </Col>
              </Row>
              <ProjectsList projects={userProjects} isLoading={isProjectsLoading} />
              {/* Replace the old RecentActivity component with the new one */}
              <RecentActivityNotifications />
            </>
          )}
        </Container>
      </div>
    </div>
  );
};

export default UserDashboardPage;