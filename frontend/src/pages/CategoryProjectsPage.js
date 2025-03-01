import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner, Pagination, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCategoryProjects } from '../services/projectService';
import placeholderImage from '../assets/image.png';

const CategoryProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState(null);
  const navigate = useNavigate();
  const { categoryId } = useParams();

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
    const fetchCategoryProjects = async () => {
      try {
        setLoading(true);
        const response = await getCategoryProjects(categoryId, currentPage);
        setProjects(response.data.projects);
        setCategory(response.data.category);
        setTotalPages(response.data.pages);
        setError(null);
      } catch (err) {
        setError('Failed to load category projects. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchCategoryProjects();
  }, [categoryId, currentPage]);

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
      if (project.image_url.startsWith('http')) {
        return project.image_url;
      }
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

  const renderProjectCard = (project) => {
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
      image_url: project.image_url
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
            {/* Add the status badge */}
            {project.status === 'ACTIVE' && (
            <Badge 
              bg="success" 
              className="status-badge"
            >
              ACTIVE
            </Badge>
          )}
          </div>
          
          <Card.Body className="pt-2 pb-2">
            <div className="category-label">
              {normalizedProject.category}
            </div>
            
            <Card.Title className="project-title">
              {normalizedProject.title}
            </Card.Title>
            
            <Card.Text className="project-brief mb-2">
              {truncateText(normalizedProject.short_description, 100)}
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
          
          <Card.Footer className="bg-white py-2">
            <div className="card-footer-content">
              <Link to={`/projects/${normalizedProject.id}`} className="w-100">
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

  return (
    <Container className="saved-projects-page py-4">
      <div className="header-section mb-4">
        <div className="title-section">
          <h1 className="mb-0">{category?.name || 'Category Projects'}</h1>
          <Badge bg="primary" className="project-count">
            {projects.length} Projects
          </Badge>
        </div>
        {/* <Button 
          variant="primary" 
          className="discover-button"
          onClick={() => navigate('/discover')}
        >
          <FontAwesomeIcon icon={faSearch} className="me-2" /> Browse Categories
        </Button> */}
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {loading ? (
        <div className="text-center mt-4">
          <Spinner animation="border" role="status" className="text-primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state text-center py-5">
          <i className="bi bi-collection empty-icon mb-3"></i>
          <h3>No projects found</h3>
          <p className="text-muted">
            There are currently no projects in this category.
          </p>
          <Button 
            variant="primary" 
            onClick={() => navigate('/discover')}
          >
            Browse Categories
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

export default CategoryProjectsPage;