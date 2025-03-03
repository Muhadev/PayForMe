import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { fetchDiscoveryProjects, fetchCategories, api  } from '../../services/projectService';
import * as backerService from '../../services/backerService';
import placeholderImage from '../../assets/featured-image.png';
import './DiscoverySection.css';
// import { fetchCategories, api } from '../services/projectService';

const DiscoverySection = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to strip HTML tags from text
  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Helper function to truncate text
  const truncateText = (text, maxLength = 80) => {
    if (!text) return '';
    text = stripHtml(text);
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

 // In DiscoverySection.js - modify the useEffect for loading projects

useEffect(() => {
  const loadProjects = async () => {
    try {
      setLoading(true);
      
      // Fetch categories first (same as in UserDashboardPage)
      const categoriesResponse = await fetchCategories();
      const categories = categoriesResponse.data || [];
      
      // Map categories by ID for easy lookup
      const categoriesMap = categories.reduce((map, category) => {
        map[category.id] = category;
        return map;
      }, {});
      
      // Fetch discovery projects
      const response = await fetchDiscoveryProjects();
      const data = response.data;
      
      // Combine featured and trending projects
      let allProjects = [];
      if (data.featured) {
        // Add featured flag to the featured project
        data.featured.isFeatured = true;
        allProjects.push(data.featured);
      }
      
      // Add trending projects
      if (data.trending && data.trending.length > 0) {
        allProjects = [...allProjects, ...data.trending];
      }
      
      // Enhance projects with full category objects
      const enhancedProjects = allProjects.map(project => {
        if (project.category_id && categoriesMap[project.category_id]) {
          return {
            ...project,
            category: categoriesMap[project.category_id]
          };
        }
        return project;
      });
      
      // Ensure we have exactly 5 projects
      while (enhancedProjects.length < 5) {
        enhancedProjects.push({
          id: `placeholder-${enhancedProjects.length}`,
          title: 'Coming Soon',
          current_amount: 0,
          funding_goal: 100,
          backers_count: 0,
          isPlaceholder: true
        });
      }
      
      setProjects(enhancedProjects.slice(0, 5));
      setError(null);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError('Unable to load projects. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  loadProjects();
}, []);

  // Add this new effect to fetch backer stats for projects
  useEffect(() => {
    const fetchBackerStatsForProjects = async () => {
      if (!projects.length) return;
      
      // Filter active projects that need stats (excluding placeholders)
      const projectsNeedingStats = projects.filter(
        project => !project.isPlaceholder && 
                   project.status?.toLowerCase() !== 'draft' && 
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

  const formatCurrency = (amount) => {
    const number = parseFloat(amount);
    return isNaN(number) ? "$0" : `$${number.toLocaleString()}`;
  };

  const calculateProgress = (raised, goal) => {
    if (!raised || !goal) return 0;
    const progress = (raised / goal) * 100;
    return isNaN(progress) ? 0 : Math.min(progress, 100);
  };

  // Updated image URL method matching SavedProjectsPage
  const getImageUrl = (project) => {
    if (project?.image_url) {
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

  const getTimeStatus = (project) => {
    if (!project?.end_date) return 'No timeline';
    
    const endDate = new Date(project.end_date);
    const now = new Date();
    
    if (now > endDate) {
      return 'Ended';
    }
    
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    return `${daysLeft} days left`;
  };

  // Helper function to extract category name from project data
  const getCategoryName = (project) => {
    if (project.category?.name) {
      return project.category.name;
    }
    return 'Uncategorized';
  };

  if (loading) {
    return (
      <section className="discovery-section">
        <Container>
          <div className="discovery-header">
            <h2>Discover Projects That Matter</h2>
            <p>Find and support amazing initiatives from around the world</p>
          </div>
          <div className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary" />
            <p className="mt-3">Loading projects...</p>
          </div>
        </Container>
      </section>
    );
  }

  if (error) {
    return (
      <section className="discovery-section">
        <Container>
          <div className="discovery-header">
            <h2>Discover Projects That Matter</h2>
            <p>Find and support amazing initiatives from around the world</p>
          </div>
          <div className="text-center py-5">
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          </div>
        </Container>
      </section>
    );
  }

  const renderProjectCard = (project) => {
    // Normalize property names to handle different API response formats
    const normalizedProject = {
      id: project.id,
      title: project.title || 'Unnamed Project',
      categoryName: getCategoryName(project),
      short_description: stripHtml(project.short_description || project.description || ''),
      current_amount: parseFloat(project.current_amount || project.total_pledged || 0),
      funding_goal: parseFloat(project.funding_goal || project.goal_amount || 0),
      backers_count: project.backers_count || 0,
      end_date: project.end_date,
      image_url: project.image_url,
      status: project.status,
      isFeatured: project.isFeatured,
      isPlaceholder: project.isPlaceholder
    };

    return (
      <Card className={`project-card h-100 shadow-sm ${normalizedProject.isFeatured ? 'featured-card' : ''}`}>
        <div className="position-relative">
          <Card.Img 
            variant="top" 
            src={getImageUrl(normalizedProject)} 
            alt={normalizedProject.title}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = placeholderImage;
            }}
          />
          {normalizedProject.isFeatured && (
            <Badge bg="primary" className="featured-badge">
              Featured
            </Badge>
          )}
          {normalizedProject.status === 'ACTIVE' && (
            <Badge 
              bg="success" 
              className="status-badge"
            >
              ACTIVE
            </Badge>
          )}
        </div>
        <Card.Body className="pt-2 pb-2 d-flex flex-column"> {/* Reduced padding like in SavedProjectsPage */}
          {/* Category display like in SavedProjectsPage */}
          <div className="category-label">
            {normalizedProject.categoryName}
          </div>
          
          <Card.Title className="project-title">{normalizedProject.title}</Card.Title>
          
          {/* Project description */}
          <Card.Text className="project-brief mb-2">
            {truncateText(normalizedProject.short_description, 100)}
          </Card.Text>
          
          <div className="funding-progress">
            <div className="progress">
              <div 
                className="progress-bar" 
                role="progressbar"
                style={{ width: `${calculateProgress(
                  normalizedProject.current_amount,
                  normalizedProject.funding_goal
                )}%` }}
              />
            </div>
            <div className="funding-stats d-flex justify-content-between mt-1 small">
              <div className="funding-raised">
                {formatCurrency(normalizedProject.current_amount || 0)}
                <span className="funding-label">raised</span>
              </div>
              <div className="funding-percentage">
                {calculateProgress(
                  normalizedProject.current_amount,
                  normalizedProject.funding_goal
                ).toFixed(0)}%
              </div>
            </div>
          </div>
          
          <div className="project-meta">
            <div className="meta-item backers">
              <i className="bi bi-people"></i>
              <span>{normalizedProject.backers_count || 0}</span>
            </div>
            
            <div className="meta-item time-status">
              <i className="bi bi-clock"></i>
              <span>{getTimeStatus(normalizedProject).includes('days') ? 
                getTimeStatus(normalizedProject).replace(' days left', '') : 
                '—'}</span>
            </div>
            
            <div className="meta-item goal">
              <i className="bi bi-bullseye"></i>
              <span>{formatCurrency(normalizedProject.funding_goal)}</span>
            </div>
          </div>

          {!normalizedProject.isPlaceholder && (
            <Link to={`/projects/${normalizedProject.id}`} className="btn btn-outline-primary mt-auto">
              View Project
            </Link>
          )}
        </Card.Body>
      </Card>
    );
  };

  return (
    <section className="discovery-section">
      <Container>
        <div className="discovery-header">
          <h2>Discover Projects That Matter</h2>
          <p>Find and support amazing initiatives from around the world</p>
          <Link to="/discover" className="btn btn-outline-primary view-all-btn">
            View All Projects
          </Link>
        </div>
        
        {/* First row with 3 project cards, centered */}
        <Row className="justify-content-center">
          {projects.slice(0, 3).map(project => (
            <Col lg={4} md={4} sm={6} className="mb-4" key={project.id}>
              {renderProjectCard(project)}
            </Col>
          ))}
        </Row>
        
        {/* Second row with 2 project cards, centered */}
        <Row className="justify-content-center">
          {projects.slice(3, 5).map(project => (
            <Col lg={4} md={4} sm={6} className="mb-4" key={project.id}>
              {renderProjectCard(project)}
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
};

export default DiscoverySection;