import React, { useState, useEffect } from 'react';
import { Navbar, Nav, NavDropdown, Container, Form } from 'react-bootstrap';
import './Navbar.css';
import { Link } from 'react-router-dom';
import axiosInstance from '../../helper/axiosConfig';

function AppNavbar() {
  const [categories, setCategories] = useState([]);

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
  }, []);

  return (
    <Navbar bg="white" expand="lg" fixed="top" className="py-2">
      <Container fluid className="px-4">
        <Navbar.Brand as={Link} to="/" className="me-4">
          <i className="bi bi-piggy-bank me-2"></i>
          PayForMe
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Form className="d-flex me-auto">
            <Form.Control
              type="search"
              placeholder="Search projects"
              className="me-2"
              aria-label="Search"
            />
          </Form>

          <Nav>
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
}

export default AppNavbar;