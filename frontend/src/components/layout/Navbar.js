import React, { useState, useEffect, useRef } from 'react';
import { Navbar, Nav, NavDropdown, Container, Form } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import axiosInstance from '../../helper/axiosConfig';
import './Navbar.css';

const AppNavbar = () => {
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [navExpanded, setNavExpanded] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);

  const fetchSearchResults = debounce(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/api/v1/projects/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.data.projects.slice(0, 5)); // Limit to 5 results
      setShowDropdown(true);
    } catch (error) {
      console.error('Error fetching search results:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axiosInstance.get('api/v1/categories/');
        setCategories(response.data.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    const checkAuthStatus = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await axiosInstance.get('api/v1/profile/');
          
          if (response.data.data && response.data.data.user) {
            setUser(response.data.data.user);
            setIsAuthenticated(true);
          } else {
            throw new Error('Invalid user data structure');
          }
        } catch (error) {
          console.error('Auth validation error:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    fetchCategories();
    checkAuthStatus();

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if ((desktopSearchRef.current && !desktopSearchRef.current.contains(event.target)) &&
          (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target))) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    fetchSearchResults(query);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/projects?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowDropdown(false);
      setNavExpanded(false); // Close mobile navbar if open
    }
  };

  const handleResultClick = (projectId) => {
    navigate(`/projects/${projectId}`);
    setSearchQuery('');
    setShowDropdown(false);
    setNavExpanded(false); // Close mobile navbar if open
  };

  const handleSignOut = async () => {
    try {
      await axiosInstance.delete('api/v1/auth/logout');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      setIsAuthenticated(false);
      setUser(null);
      navigate('/');
    }
  };

  // Auth-dependent navigation items
  const renderAuthButtons = () => {
    if (isAuthenticated && user) {
      return (
        <>
          <Link to="/projects/create" className="btn btn-primary rounded-pill me-2">
            Start Project
          </Link>
          
          <NavDropdown 
            title={
              <div className="d-flex align-items-center">
                <i className="bi bi-person-circle me-1"></i>
                {user.username || user.full_name || 'Account'}
              </div>
            } 
            id="user-dropdown"
          >
            <NavDropdown.Item as={Link} to="/dashboard">Dashboard</NavDropdown.Item>
            <NavDropdown.Item as={Link} to="/profile">My Profile</NavDropdown.Item>
            <NavDropdown.Item as={Link} to="/my-projects">My Projects</NavDropdown.Item>
            <NavDropdown.Divider />
            <NavDropdown.Item onClick={handleSignOut}>Sign Out</NavDropdown.Item>
          </NavDropdown>
        </>
      );
    } else {
      return (
        <>
          <Link to="/projects/create" className="btn btn-primary rounded-pill me-2">
            Start Project
          </Link>
          <Nav.Link as={Link} to="/signin" className="btn btn-outline-primary rounded-pill">
            Sign In
          </Nav.Link>
        </>
      );
    }
  };

  return (
    <Navbar 
      bg="white" 
      expand="lg" 
      fixed="top" 
      className="py-2" 
      expanded={navExpanded}
      onToggle={(expanded) => setNavExpanded(expanded)}
    >
      <Container fluid className="px-2">
        <Navbar.Brand as={Link} to="/" className="me-4">
          <i className="bi bi-piggy-bank me-2"></i>
          PayForMe
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav"/>
        <Navbar.Collapse id="basic-navbar-nav">
          {/* Move search to outside the collapse on mobile for better UX */}
          <div className="d-lg-none w-100 mb-3">
            <div className="search-container position-relative" ref={searchRef}>
              <Form onSubmit={handleSearchSubmit}>
                <Form.Control
                  type="search"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  aria-label="Search"
                />
              </Form>

              {showDropdown && searchResults.length > 0 && (
                <div className="search-results-dropdown bg-white border rounded mt-1">
                  {searchResults.map((project) => (
                    <div
                      key={project.id}
                      className="search-result-item d-flex align-items-center"
                      onClick={() => handleResultClick(project.id)}
                    >
                      <div>
                        <div className="search-result-title">{project.title}</div>
                        <small className="text-muted">
                          {project.category_name || 'Uncategorized'}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isLoading && (
                <div className="search-results-dropdown bg-white border rounded mt-1 p-3 text-center">
                  Loading...
                </div>
              )}
            </div>
          </div>

          <div className="search-container position-relative me-auto d-none d-lg-block" ref={searchRef}>
            <Form onSubmit={handleSearchSubmit}>
              <Form.Control
                type="search"
                placeholder="Search projects..."
                className="me-2"
                value={searchQuery}
                onChange={handleSearchChange}
                aria-label="Search"
              />
            </Form>

            {showDropdown && searchResults.length > 0 && (
              <div className="search-results-dropdown bg-white border rounded mt-1">
                {searchResults.map((project) => (
                  <div
                    key={project.id}
                    className="search-result-item d-flex align-items-center"
                    onClick={() => handleResultClick(project.id)}
                  >
                    <div>
                      <div className="search-result-title">{project.title}</div>
                      <small className="text-muted">
                        {project.category_name || 'Uncategorized'}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isLoading && (
              <div className="search-results-dropdown bg-white border rounded mt-1 p-3 text-center">
                Loading...
              </div>
            )}
          </div>

          <Nav>
            <NavDropdown title="Categories" id="basic-nav-dropdown" className="me-2">
              {categories.map((category) => (
                <NavDropdown.Item 
                  key={category.id}
                  as={Link} 
                  to={`/category/${category.id}`}
                  onClick={() => setNavExpanded(false)}
                >
                  {category.name}
                </NavDropdown.Item>
              ))}
            </NavDropdown>

            <Nav.Link as={Link} to="/about" className="me-2" onClick={() => setNavExpanded(false)}>About</Nav.Link>
            <Nav.Link as={Link} to="/faqs" className="me-2" onClick={() => setNavExpanded(false)}>FAQs</Nav.Link>
            {isAuthenticated && (
              <Nav.Link as={Link} to="/dashboard" className="me-2" onClick={() => setNavExpanded(false)}>Dashboard</Nav.Link>
            )}
            
            {/* Conditionally render auth-dependent buttons */}
            {renderAuthButtons()}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;