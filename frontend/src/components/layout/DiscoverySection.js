import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { fetchDiscoveryProjects } from '../../services/projectService';
import placeholderImage from '../../assets/featured-image.png';
import './DiscoverySection.css';

const DiscoverySection = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to strip HTML tags from text (copied from CategoryProjectsPage)
  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Helper function to truncate text (copied from CategoryProjectsPage)
  const truncateText = (text, maxLength = 80) => {
    if (!text) return '';
    text = stripHtml(text);
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        // Using the new discovery endpoint
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
        
        // Ensure we have exactly 5 projects (3 for first row, 2 for second row)
        if (allProjects.length < 5) {
          console.warn(`Only ${allProjects.length} projects available, need 5`);
        }
        
        // Pad with empty projects if needed for development/testing
        while (allProjects.length < 5) {
          allProjects.push({
            id: `placeholder-${allProjects.length}`,
            title: 'Coming Soon',
            current_amount: 0,
            funding_goal: 100,
            backers_count: 0,
            isPlaceholder: true
          });
        }
        
        setProjects(allProjects.slice(0, 5));
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
    if (project?.image_url) {
      return project.image_url;
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
    return (
      <Col key={project.id} className="mb-4">
        <Card className={`project-card h-100 shadow-sm ${project.isFeatured ? 'featured-card' : ''}`}>
          <div className="project-image-container">
            <Card.Img 
              variant="top" 
              src={getImageUrl(project)} 
              alt={project.title}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = placeholderImage;
              }}
            />
            {project.isFeatured && (
              <Badge bg="primary" className="featured-badge">
                Featured
              </Badge>
            )}
            {project.status === 'ACTIVE' && (
              <Badge 
                bg="success" 
                className="status-badge"
              >
                ACTIVE
              </Badge>
            )}
            {project.category && (
              <Badge bg="secondary" className="category-badge">
                {project.category?.name || project.category_name || 'Uncategorized'}
              </Badge>
            )}
          </div>
          <Card.Body className="d-flex flex-column">
            <Card.Title className="project-title">{project.title}</Card.Title>
            
            {/* Added project description - similar to CategoryProjectsPage */}
            <Card.Text className="project-brief mb-2">
              {truncateText(project.short_description || project.description, 100)}
            </Card.Text>
            
            <div className="project-meta">
              <div className="meta-stat backers">
                <i className="bi bi-people"></i>
                <span>{project.backers_count || 0} backers</span>
              </div>
              <div className="meta-stat time">
                <i className="bi bi-clock"></i>
                <span>{getTimeStatus(project)}</span>
              </div>
            </div>

            <div className="funding-progress mt-2">
              <div className="progress">
                <div 
                  className="progress-bar" 
                  role="progressbar"
                  style={{ width: `${calculateProgress(
                    project.current_amount || project.total_pledged,
                    project.funding_goal || project.goal_amount
                  )}%` }}
                />
              </div>
              <div className="funding-stats d-flex justify-content-between mt-1 small">
                <div className="raised">
                  {formatCurrency(project.current_amount || project.total_pledged || 0)}
                </div>
                <div className="percentage">
                  {calculateProgress(
                    project.current_amount || project.total_pledged,
                    project.funding_goal || project.goal_amount
                  ).toFixed(0)}%
                </div>
              </div>
            </div>

            {!project.isPlaceholder && (
              <Link to={`/projects/${project.id}`} className="btn btn-outline-primary mt-auto">
                View Project
              </Link>
            )}
          </Card.Body>
        </Card>
      </Col>
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