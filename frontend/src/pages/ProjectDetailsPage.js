import React from 'react';
import { Container, Row, Col, Card, Button, ProgressBar, Tabs, Tab, Image } from 'react-bootstrap';

const ProjectDetailsPage = () => {
  return (
    <Container className="mt-5 pt-5">
      <Row>
        {/* Main Content */}
        <Col md={8}>
          {/* Project Header */}
          <Card className="mb-4">
            <Card.Body>
              <h2>Project Title</h2>
              <h5 className="text-muted">A brief catchy tagline goes here.</h5>
              <div className="d-flex justify-content-between align-items-center mt-4">
                <div>
                  <h3>$12,345</h3>
                  <p className="text-muted">raised of $50,000 goal</p>
                </div>
                <div>
                  <h3>15</h3>
                  <p className="text-muted">days left</p>
                </div>
                <div>
                  <Button variant="primary" size="lg">Back This Project</Button>
                </div>
              </div>
              <ProgressBar now={25} className="my-4" />
              <div className="d-flex justify-content-between">
                <Button variant="outline-primary">Share</Button>
                <Button variant="outline-secondary">Save</Button>
              </div>
            </Card.Body>
          </Card>

          {/* Media Section */}
          <Card className="mb-4">
            <Card.Body>
              <div className="embed-responsive embed-responsive-16by9 mb-4">
              <iframe 
                    className="embed-responsive-item" 
                    src="https://www.youtube.com/embed/EWdcOID8zxU" 
                    allowFullScreen 
                    title="Project video overview"  // Add a descriptive title
                  ></iframe>
              </div>
              <Row>
                <Col md={4}><img src="https://via.placeholder.com/300" alt="Project sample 1" className="img-fluid mb-2" /></Col>
                <Col md={4}><img src="https://via.placeholder.com/300" alt="Project sample 2" className="img-fluid mb-2" /></Col>
                <Col md={4}><img src="https://via.placeholder.com/300" alt="Project sample 3" className="img-fluid mb-2" /></Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Project Description and Tabs */}
          <Tabs defaultActiveKey="overview" id="project-details-tabs">
            <Tab eventKey="overview" title="Overview">
              <Card className="mb-4">
                <Card.Body>
                  <h4>Project Description</h4>
                  <p>This is where the detailed project description will go. Explain the purpose, goals, and other important information about the project.</p>
                  <h4>Risks & Challenges</h4>
                  <p>Outline any potential risks or challenges the project might face and how they will be mitigated.</p>
                </Card.Body>
              </Card>
            </Tab>
            <Tab eventKey="updates" title="Updates">
              <Card className="mb-4">
                <Card.Body>
                  <h4>Updates</h4>
                  <p>No updates yet. Stay tuned!</p>
                </Card.Body>
              </Card>
            </Tab>
            <Tab eventKey="comments" title="Comments">
              <Card className="mb-4">
                <Card.Body>
                  <h4>Comments</h4>
                  <p>No comments yet. Be the first to comment!</p>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Col>

        {/* Sidebar */}
        <Col md={4}>
          <Card className="mb-4">
            <Card.Body>
              <h5>About the Creator</h5>
              <Row className="align-items-center">
                <Col xs={3}>
                  <Image
                    width={64}
                    height={64}
                    className="rounded-circle"
                    src="https://via.placeholder.com/64"
                    alt="Creator"
                  />
                </Col>
                <Col xs={9}>
                  <h6>John Doe</h6>
                  <p className="text-muted">A brief bio about the project creator.</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Body>
              <h5>Rewards</h5>
              <ul className="list-unstyled">
                <li className="mb-2">
                  <strong>$50 - Basic Supporter</strong>
                  <p className="text-muted mb-0">Get a thank you card and a mention on our website.</p>
                </li>
                <li className="mb-2">
                  <strong>$100 - Premium Supporter</strong>
                  <p className="text-muted mb-0">Get a thank you card, a mention on our website, and a t-shirt.</p>
                </li>
                <li>
                  <strong>$500 - Ultimate Supporter</strong>
                  <p className="text-muted mb-0">Get all previous rewards plus an invitation to our launch event.</p>
                </li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Related Projects */}
      <h3>Related Projects</h3>
      <Row>
        {[1, 2, 3].map((project) => (
          <Col md={4} key={project}>
            <Card className="mb-4">
              <Card.Img variant="top" src={`https://via.placeholder.com/300x200?text=Related+Project+${project}`} />
              <Card.Body>
                <Card.Title>Related Project {project}</Card.Title>
                <Button variant="outline-primary">View Project</Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default ProjectDetailsPage;
