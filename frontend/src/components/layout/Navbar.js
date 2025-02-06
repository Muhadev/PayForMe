import React from 'react';
import { Navbar, Nav, NavDropdown, Container, Form } from 'react-bootstrap';
import './Navbar.css';

function AppNavbar() {
  return (
    <Navbar bg="white" expand="lg" fixed="top" className="py-2">
      <Container fluid className="px-4">
        <Navbar.Brand href="/" className="me-4">
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
              <NavDropdown.Item href="/category/tech">Tech</NavDropdown.Item>
              <NavDropdown.Item href="/category/arts">Arts</NavDropdown.Item>
              <NavDropdown.Item href="/category/community">Community</NavDropdown.Item>
            </NavDropdown>

            <Nav.Link href="/about" className="me-2">About</Nav.Link>
            <Nav.Link href="/dashboard" className="me-2">Dashboard</Nav.Link>
            <Nav.Link href="/faqs" className="me-2">FAQs</Nav.Link>

            <button className="btn btn-primary rounded-pill me-2">
              Start Project
            </button>
            <Nav.Link href="/signin" className="btn btn-outline-primary rounded-pill">
              Sign In
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;