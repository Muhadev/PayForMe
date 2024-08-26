import React from 'react';
import { Container, Row, Col, Card, Button, Nav } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faChartLine, faHeart, faBell } from '@fortawesome/free-solid-svg-icons';
import './UserDashboardPage.css'; // Import the new CSS file
import { Link } from 'react-router-dom';

const UserDashboardPage = () => {
  return (
    <div className="dashboard-container"> {/* Add top padding to account for fixed navbar */}
      <Container fluid className="mt-4">
        <Row>
          {/* Left Sidebar */}
          <Col md={3}>
            <Card>
              <Card.Body>
                <div className="text-center mb-4">
                  <img
                    src="https://via.placeholder.com/150"
                    alt="Profile"
                    className="rounded-circle mb-3"
                    style={{ width: '100px', height: '100px' }}
                  />
                  <h4>John Doe</h4>
                </div>
                <Nav className="flex-column">
                  <Nav.Link href="#dashboard" active>Dashboard</Nav.Link>
                  <Nav.Link href="#my-projects">My Projects</Nav.Link>
                  <Nav.Link href="#backed-projects">Backed Projects</Nav.Link>
                  <Nav.Link href="#profile">Profile</Nav.Link>
                  <Nav.Link href="#settings">Settings</Nav.Link>
                </Nav>
              </Card.Body>
            </Card>
          </Col>

          {/* Main Content */}
          <Col md={9}>
            {/* Quick Stats */}
            <Row className="mb-4">
              <Col md={4}>
                <Card className="text-center">
                  <Card.Body>
                    <FontAwesomeIcon icon={faChartLine} size="2x" className="mb-2 text-primary" />
                    <h5>Total Raised</h5>
                    <h3>$12,345</h3>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="text-center">
                  <Card.Body>
                    <FontAwesomeIcon icon={faPlus} size="2x" className="mb-2 text-success" />
                    <h5>Projects Created</h5>
                    <h3>3</h3>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="text-center">
                  <Card.Body>
                    <FontAwesomeIcon icon={faHeart} size="2x" className="mb-2 text-danger" />
                    <h5>Projects Backed</h5>
                    <h3>7</h3>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* My Projects */}
            <Card className="mb-4">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">My Projects</h5>
                <Link to="/create-project">
                  <Button variant="primary" size="sm">
                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                    Create New Project
                  </Button>
                </Link>
              </Card.Header>
              <Card.Body>
                <Row>
                  {[1, 2, 3].map((project) => (
                    <Col md={4} key={project}>
                      <Card>
                        <Card.Img variant="top" src={`https://via.placeholder.com/300x200?text=Project+${project}`} />
                        <Card.Body>
                          <Card.Title>Project {project}</Card.Title>
                          <Card.Text>
                            $1,234 raised of $5,000 goal
                          </Card.Text>
                          <div className="progress mb-2">
                            <div className="progress-bar" role="progressbar" style={{width: '25%'}} aria-valuenow="25" aria-valuemin="0" aria-valuemax="100"></div>
                          </div>
                          <Button variant="outline-primary" size="sm">View Details</Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>

            {/* Recent Activity */}
            <Card >
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
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default UserDashboardPage;