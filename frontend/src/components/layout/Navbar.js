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
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const fetchSearchResults = debounce(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/api/v1/projects/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.data.projects.slice(0, 5)); // Limit to 5 results
      setShowDropdown(true);
    } catch (error) {
      console.error('Error fetching search results:', error);
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

    fetchCategories();

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
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
    }
  };

  const handleResultClick = (projectId) => {
    navigate(`/projects/${projectId}`);
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <Navbar bg="white" expand="lg" fixed="top" className="py-2">
      <Container fluid className="px-4">
        <Navbar.Brand as={Link} to="/" className="me-4">
          <i className="bi bi-piggy-bank me-2"></i>
          PayForMe
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <div className="search-container position-relative me-auto" ref={searchRef}>
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
                    className="search-result-item d-flex align-items-center hover:bg-gray-100"
                    onClick={() => handleResultClick(project.id)}
                  >
                    {/* {project.image_url && (
                      <img
                        src={project.image_url}
                        alt={project.title}
                        className="search-result-image me-3"
                      />
                    )} */}
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
            {/* Rest of your navigation items remain the same */}
            <NavDropdown title="Categories" id="basic-nav-dropdown" className="me-2">
              {categories.map((category) => (
                <NavDropdown.Item 
                  key={category.id}
                  as={Link} 
                  to={`/category/${category.id}`}
                >
                  {category.name}
                </NavDropdown.Item>
              ))}
            </NavDropdown>

            <Nav.Link as={Link} to="/about" className="me-2">About</Nav.Link>
            <Nav.Link as={Link} to="/dashboard" className="me-2">Dashboard</Nav.Link>
            <Nav.Link as={Link} to="/faqs" className="me-2">FAQs</Nav.Link>

            <Link to="/projects/create" className="btn btn-primary rounded-pill me-2">
              Start Project
            </Link>
            <Nav.Link as={Link} to="/signin" className="btn btn-outline-primary rounded-pill">
              Sign In
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;