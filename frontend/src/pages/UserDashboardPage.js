import React from 'react';
import { Container, Row, Col, Card, Button, Nav } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faChartLine, faHeart, faBell } from '@fortawesome/free-solid-svg-icons';
import './UserDashboardPage.css';
import { Link, NavLink } from 'react-router-dom';
import placeholderImage from '../assets/image.png';  // Adjust the path according to your folder structure
import profileholderImage from '../assets/news2.png';  // Adjust the path according to your folder structure


const Sidebar = () => (
  <Col md={3} className="sidebar">
  <Card>
    <Card.Body>
      <div className="text-center mb-4">
        <img
          src={profileholderImage}
          alt="Profile"
          className="rounded-circle mb-3"
          style={{ width: '100px', height: '110px', objectFit: 'cover' }}
        />
        <h4>John Doe</h4>
      </div>
      <Nav className="flex-column">
      <Nav.Link as={NavLink} to="/dashboard" activeclassname="active">Dashboard</Nav.Link>
      <Nav.Link as={NavLink} to="/my-projects" activeclassname="active">My Projects</Nav.Link>
      <Nav.Link as={NavLink} to="/backed-projects" activeclassname="active">Backed Projects</Nav.Link>
      <Nav.Link as={NavLink} to="/profile" activeclassname="active">Profile</Nav.Link>
      <Nav.Link as={NavLink} to="/settings" activeclassname="active">Settings</Nav.Link>
    </Nav>
    </Card.Body>
  </Card>
</Col>
);

const StatsCard = ({ icon, title, value, color }) => (
  <Card className="text-center">
    <Card.Body>
      <FontAwesomeIcon icon={icon} size="2x" className={`mb-2 text-${color}`} />
      <h5>{title}</h5>
      <h3>{value}</h3>
    </Card.Body>
  </Card>
);

const ProjectsList = () => (
  <Card className="mb-4">
    <Card.Header className="d-flex justify-content-between align-items-center">
      <h5 className="mb-0">My Latest Projects</h5>
      <Link to="/projects/create">
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
            <Card.Img 
                variant="top" 
                src={project.image_url || placeholderImage} 
                style={{ height: '200px', objectFit: 'cover' }}  // This will maintain aspect ratio
              />
              <Card.Body>
                <Card.Title>Project {project}</Card.Title>
                <Card.Text>$1,234 raised of $5,000 goal</Card.Text>
                <div className="progress mb-2">
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: '25%' }}
                    aria-valuenow="25"
                    aria-valuemin="0"
                    aria-valuemax="100"
                  />
                </div>
                <Button variant="outline-primary" size="sm">View Details</Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Card.Body>
  </Card>
);

const RecentActivity = () => (
  <Card>
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
);

const UserDashboardPage = () => (
  <div className="dashboard-container">
    <Sidebar />
    <div className="main-content">
      <Container fluid>
        <Row className="mb-4">
          <Col md={4}><StatsCard icon={faChartLine} title="Total Raised" value="$12,345" color="primary" /></Col>
          <Col md={4}><StatsCard icon={faPlus} title="Projects Created" value="3" color="success" /></Col>
          <Col md={4}><StatsCard icon={faHeart} title="Projects Backed" value="7" color="danger" /></Col>
        </Row>
        <ProjectsList />
        <RecentActivity />
      </Container>
    </div>
  </div>
);

export default UserDashboardPage;
