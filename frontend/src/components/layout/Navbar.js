import React from 'react';
import { Navbar, Nav, NavDropdown, Container, Form } from 'react-bootstrap';
import './Navbar.css';

function AppNavbar() {
  return (
    <Navbar bg="white" expand="lg" fixed="top">
      <Container>
        <Navbar.Brand href="/">
          <i className="bi bi-piggy-bank"></i>
          <span className="brand-logo">PayForMe</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Form className="d-flex">
            <Form.Control
              type="search"
              placeholder="Search projects"
              aria-label="Search"
            />
          </Form>

          <Nav className="mx-auto">
            {/* <Nav.Link href="/discover">
              <i className="bi bi-compass"></i>
              Discover
            </Nav.Link> */}

            <NavDropdown title={
              <span>
                <i className="bi bi-grid"></i>
                Categories
              </span>
            } id="basic-nav-dropdown">
              <NavDropdown.Item href="/category/tech">Tech</NavDropdown.Item>
              <NavDropdown.Item href="/category/arts">Arts</NavDropdown.Item>
              <NavDropdown.Item href="/category/community">Community</NavDropdown.Item>
            </NavDropdown>

            <Nav.Link href="/about">
              <i className="bi bi-info-circle"></i>
              About Us
            </Nav.Link>

            <Nav.Link href="/dashboard">
              <i className="bi bi-speedometer2"></i>
              Dashboard
            </Nav.Link>

            <Nav.Link href="/faqs">
              <i className="bi bi-question-circle"></i>
              FAQs
            </Nav.Link>
          </Nav>

          <Nav>
            <button className="btn btn-primary start-project-btn">
              <i className="bi bi-plus-circle"></i>
              Start a Project
            </button>
            <Nav.Link href="/signin" className="sign-in">
              <i className="bi bi-person"></i>
              Sign In
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;