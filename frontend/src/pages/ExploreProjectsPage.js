import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner, Pagination, Alert, OverlayTrigger, Tooltip, Form, InputGroup, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faSortAmountDown } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { getAllProjects, fetchCategories } from '../services/projectService';
import placeholderImage from '../assets/image.png';
import * as backerService from '../services/backerService';

const ExploreProjectsPage = () => {
  // State variables
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    status: [],
    category: [],
    progress: [],
  });
  const [sortOption, setSortOption] = useState('newest');
  const [categories, setCategories] = useState([]);
  const [totalProjects, setTotalProjects] = useState(0);

  // Helper functions
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

  // Fetch projects effect
  useEffect(() => {
    const fetchExploreProjects = async () => {
      try {
        setLoading(true);
        // Add filters and sorting to the API call
        const response = await getAllProjects({
          page: currentPage,
          search: searchTerm,
          filters: selectedFilters,
          sort: sortOption,
          include: ['categories']
        });
        
        // Handle different response structures
        const projectsData = response?.data?.projects || 
                             response?.projects || 
                             response?.data || 
                             response || 
                             [];
        
        // Ensure we have an array
        const projectsList = Array.isArray(projectsData) ? projectsData : [];
        
        setProjects(projectsList);
        
        // Set total projects count and pages
        setTotalProjects(response?.data?.total || response?.total || 0);
        setTotalPages(response?.data?.pages || response?.pages || 1);
        
        setError(null);
      } catch (err) {
        setError('Failed to load projects. Please try again later.');
        console.error('Error fetching projects:', err);
        // Set to empty array to prevent map error
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
  
    fetchExploreProjects();
  }, [currentPage, searchTerm, selectedFilters, sortOption]);

  // Fetch categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesResponse = await fetchCategories();
        setCategories(categoriesResponse.data || []);
      } catch (error) {
        console.error('Failed to load categories', error);
        setCategories([]);
      }
    };
  
    loadCategories();
  }, []);

  // Format helpers
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

  // Fetch backer stats for each project
  useEffect(() => {
    const fetchBackerStatsForProjects = async () => {
      if (!projects.length) return;
      
      const projectsNeedingStats = projects.filter(
        project => project.status?.toLowerCase() !== 'draft' && 
                  project.status?.toLowerCase() !== 'pending' &&
                  project.status?.toLowerCase() !== 'revoked'
      );
      
      if (!projectsNeedingStats.length) return;
      
      try {
        const statsPromises = projectsNeedingStats.map(project => 
          backerService.fetchBackerStats(project.id)
        );
        
        const statsResults = await Promise.all(statsPromises);
        
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

  // Search handler
  const handleSearch = (e) => {
    e.preventDefault();
    // Reset to first page when searching
    setCurrentPage(1);
    // The search term is already set via input onChange
  };

  // Filter handlers
  const toggleFilter = (type, value) => {
    setSelectedFilters(prev => {
      const current = [...prev[type]];
      const index = current.indexOf(value);
      
      if (index === -1) {
        current.push(value);
      } else {
        current.splice(index, 1);
      }
      
      return {
        ...prev,
        [type]: current
      };
    });
    
    // Reset to first page when filtering
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedFilters({
      status: [],
      category: [],
      progress: []
    });
    setSearchTerm('');
    setSortOption('newest');
  };

  // Card rendering
  const renderProjectCard = (project) => {
    const normalizedProject = {
      id: project.id,
      title: project.title || 'Unnamed Project',
      category: (() => {
        // If categories is an object with name property
        if (project.categories && typeof project.categories === 'object') {
          return project.categories.name || 
                 project.categories.title || 
                 project.categories.category_name || 
                 'Uncategorized';
        }
        
        // If we have a category_id and categories array
        if (project.category_id && categories.length > 0) {
          const categoryObject = categories.find(cat => cat.id === project.category_id);
          if (categoryObject) {
            return categoryObject.name;
          }
        }
        
        // Fallback to other potential category fields
        return project.category_name || 
               project.category || 
               (project.category_id ? `Category ${project.category_id}` : 'Uncategorized');
      })(),
      short_description: stripHtml(project.short_description || project.description || ''),
      current_amount: parseFloat(project.current_amount || project.total_pledged || 0),
      funding_goal: parseFloat(project.funding_goal || project.goal_amount || 0),
      backers_count: project.backers_count || 0,
      days_left: project.days_left,
      end_date: project.end_date,
      image_url: project.image_url,
      status: project.status
    };
    
    const progress = calculateProgress(normalizedProject.current_amount, normalizedProject.funding_goal);
    const timeStatus = getProjectTimeStatus(normalizedProject);
  
    return (
      <Col md={4} key={normalizedProject.id} className="mb-4">
        <Card className="project-card h-100 shadow-sm">
          <div className="position-relative">
            <Card.Img 
              variant="top" 
              src={getImageUrl(normalizedProject)} 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = placeholderImage;
              }}
            />
            {normalizedProject.status && (
              <Badge 
                bg={normalizedProject.status.toLowerCase() === 'active' ? 'success' : 'secondary'} 
                className="status-badge"
              >
                {normalizedProject.status}
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
                <span>{normalizedProject.backers_count || 0}</span>
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

  // Pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    let items = [];
    // Show at most 5 page numbers, centered around the current page
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    // Adjust start page if we're at the end
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    if (startPage > 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => setCurrentPage(1)}>
          1
        </Pagination.Item>
      );
      if (startPage > 2) {
        items.push(<Pagination.Ellipsis key="ellipsis1" disabled />);
      }
    }

    for (let number = startPage; number <= endPage; number++) {
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

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<Pagination.Ellipsis key="ellipsis2" disabled />);
      }
      items.push(
        <Pagination.Item key={totalPages} onClick={() => setCurrentPage(totalPages)}>
          {totalPages}
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

  // Filter Panel
  const renderFilterPanel = () => {
    return (
      <div className="filter-panel mb-4 p-3 border rounded bg-light">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Filters</h5>
          <Button 
            variant="link" 
            size="sm" 
            onClick={clearFilters}
            className="text-decoration-none"
          >
            Clear All
          </Button>
        </div>
        
        <Row>
          {/* Status Filter */}
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <div>
                {['Active', 'Completed', 'Upcoming'].map(status => (
                  <Form.Check 
                    key={status}
                    type="checkbox"
                    id={`status-${status.toLowerCase()}`}
                    label={status}
                    checked={selectedFilters.status.includes(status.toLowerCase())}
                    onChange={() => toggleFilter('status', status.toLowerCase())}
                  />
                ))}
              </div>
            </Form.Group>
          </Col>
          
          {/* Category Filter */}
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Categories</Form.Label>
              <div style={{maxHeight: '150px', overflowY: 'auto'}}>
                {categories.map(category => (
                  <Form.Check 
                    key={category.id}
                    type="checkbox"
                    id={`category-${category.id}`}
                    label={category.name}
                    checked={selectedFilters.category.includes(category.id.toString())}
                    onChange={() => toggleFilter('category', category.id.toString())}
                  />
                ))}
              </div>
            </Form.Group>
          </Col>
          
          {/* Progress Filter */}
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Progress</Form.Label>
              <div>
                {[
                  { label: 'Just Started (< 25%)', value: 'under25' },
                  { label: 'Making Progress (25-75%)', value: '25to75' },
                  { label: 'Almost There (75-99%)', value: '75to99' },
                  { label: 'Fully Funded (100%+)', value: 'funded' }
                ].map(option => (
                  <Form.Check 
                    key={option.value}
                    type="checkbox"
                    id={`progress-${option.value}`}
                    label={option.label}
                    checked={selectedFilters.progress.includes(option.value)}
                    onChange={() => toggleFilter('progress', option.value)}
                  />
                ))}
              </div>
            </Form.Group>
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <Container className="explore-projects-page py-4">
      <div className="header-section mb-4">
        <div className="title-section">
          <h1 className="mb-0">Explore Projects</h1>
          <Badge bg="primary" className="project-count">
            {loading ? '...' : `${totalProjects} Projects`}
          </Badge>
        </div>
      </div>
      
      {/* Search & Sort Bar */}
      <div className="search-sort-bar mb-4">
        <Row className="align-items-center">
          <Col md={6}>
            <Form onSubmit={handleSearch}>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button type="submit" variant="primary">
                  <FontAwesomeIcon icon={faSearch} />
                </Button>
              </InputGroup>
            </Form>
          </Col>
          
          <Col md={6} className="d-flex justify-content-end">
            <Dropdown className="me-2">
              <Dropdown.Toggle variant="outline-secondary" id="dropdown-sort">
                <FontAwesomeIcon icon={faSortAmountDown} className="me-2" />
                {sortOption === 'newest' ? 'Newest' : 
                 sortOption === 'popular' ? 'Most Popular' : 
                 sortOption === 'ending' ? 'Ending Soon' : 
                 sortOption === 'funded' ? 'Most Funded' : 'Sort By'}
              </Dropdown.Toggle>

              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setSortOption('newest')}>Newest</Dropdown.Item>
                <Dropdown.Item onClick={() => setSortOption('popular')}>Most Popular</Dropdown.Item>
                <Dropdown.Item onClick={() => setSortOption('ending')}>Ending Soon</Dropdown.Item>
                <Dropdown.Item onClick={() => setSortOption('funded')}>Most Funded</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            
            <Button 
              variant="outline-primary"
              className="filter-toggle-btn"
              onClick={() => document.getElementById('filter-panel').classList.toggle('d-none')}
            >
              <FontAwesomeIcon icon={faFilter} className="me-2" />
              Filters
              {Object.values(selectedFilters).flat().length > 0 && (
                <Badge bg="primary" className="ms-2">
                  {Object.values(selectedFilters).flat().length}
                </Badge>
              )}
            </Button>
          </Col>
        </Row>
      </div>
      
      {/* Filter Panel (toggleable) */}
      <div id="filter-panel" className="d-none">
        {renderFilterPanel()}
      </div>
      
      {/* Active Filters Display */}
      {Object.values(selectedFilters).flat().length > 0 && (
        <div className="active-filters mb-3">
          <div className="d-flex align-items-center flex-wrap">
            <span className="me-2">Active filters:</span>
            {selectedFilters.status.map(status => (
              <Badge 
                key={`status-${status}`} 
                bg="info" 
                className="me-2 mb-2 filter-badge"
                onClick={() => toggleFilter('status', status)}
              >
                Status: {status} &times;
              </Badge>
            ))}
            {selectedFilters.category.map(catId => {
              const catName = categories.find(c => c.id.toString() === catId)?.name || catId;
              return (
                <Badge 
                  key={`cat-${catId}`} 
                  bg="info" 
                  className="me-2 mb-2 filter-badge"
                  onClick={() => toggleFilter('category', catId)}
                >
                  Category: {catName} &times;
                </Badge>
              );
            })}
            {selectedFilters.progress.map(progress => {
              const labels = {
                'under25': 'Under 25%',
                '25to75': '25% to 75%',
                '75to99': '75% to 99%',
                'funded': 'Fully Funded'
              };
              return (
                <Badge 
                  key={`progress-${progress}`} 
                  bg="info" 
                  className="me-2 mb-2 filter-badge"
                  onClick={() => toggleFilter('progress', progress)}
                >
                  Progress: {labels[progress]} &times;
                </Badge>
              );
            })}
          </div>
        </div>
      )}
      
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
          <i className="bi bi-search empty-icon mb-3"></i>
          <h3>No projects found</h3>
          <p className="text-muted">
            {searchTerm || Object.values(selectedFilters).flat().length > 0 ? 
              'Try adjusting your search or filters to find projects.' : 
              'There are currently no projects available.'}
          </p>
          {(searchTerm || Object.values(selectedFilters).flat().length > 0) && (
            <Button 
              variant="primary" 
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          )}
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

export default ExploreProjectsPage;