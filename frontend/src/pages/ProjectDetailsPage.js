import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, ProgressBar, Tabs, Tab, Badge, Alert, Image } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axios from 'axios';
import './ProjectDetailPage.css';

import { PencilIcon, GiftIcon, BellIcon, Cog, ShareIcon, BookmarkIcon } from 'lucide-react';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

const ProjectDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setIsLoading(true);
        let projectResponse;
        
        // First try to fetch as a draft
        try {
          const draftResponse = await api.get(`/api/v1/projects/drafts/${id}`);
          projectResponse = draftResponse;
          setProject(draftResponse.data.data);
          setIsDraft(true);
        } catch (draftError) {
          // If not found as draft, try regular project endpoint
          const response = await api.get(`/api/v1/projects/${id}`);
          projectResponse = response;
          setProject(response.data.data);
          setIsDraft(false);
        }
        
        // Check if current user is creator
        const userId = localStorage.getItem('userId');
        setIsCreator(projectResponse.data.data.creator_id === parseInt(userId));
        
        // Check if user is admin
        const userRole = localStorage.getItem('userRole');
        setIsAdmin(userRole === 'admin');
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to fetch project details');
        toast.error('Failed to fetch project details');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchProjectDetails();
  }, [id]);

  const handleEditDraft = () => {
    navigate(`/projects/drafts/edit/${id}`);
  };

  const handleEditProject = () => {
    navigate(`/projects/edit/${id}`);
  };

  const handleProjectAction = async (action) => {
    try {
      await api.post(`/api/v1/projects/${id}/${action}`);
      toast.success(`Project ${action} successful`);
      const response = await api.get(`/api/v1/projects/${id}`);
      setProject(response.data.data);
    } catch (error) {
      toast.error(`Failed to ${action} project`);
    }
  };

  if (isLoading) {
    return <div className="project-detail-page">Loading...</div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!project) {
    return <Alert variant="warning">Project not found</Alert>;
  }

  const percentFunded = Math.min((project.current_amount / project.goal_amount) * 100, 100);
  const daysLeft = Math.max(0, Math.ceil((new Date(project.end_date) - new Date()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="project-detail-page">
      {project.status === 'PENDING' && (
        <Alert variant="warning" className="mb-4">
          Your project is currently under review and not yet visible to others.
        </Alert>
      )}

      {isAdmin && (
        <Card className="mb-4">
          <Card.Body>
            <h5>Admin Controls</h5>
            <div className="creator-controls">
              <Button variant="success" onClick={() => handleProjectAction('approve')}>
                Approve Project
              </Button>
              <Button variant="danger" onClick={() => handleProjectAction('reject')}>
                Reject Project
              </Button>
              <Button 
                variant={project.featured ? "warning" : "primary"}
                onClick={() => handleProjectAction(project.featured ? 'unfeature' : 'feature')}
              >
                {project.featured ? 'Unfeature Project' : 'Feature Project'}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      <Container>
        <Row>
          <Col md={8}>
            <Card className="mb-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h2>{project.title}</h2>
                    <h5 className="text-muted">{project.tagline}</h5>
                    <Badge bg="primary" className="mt-2">{project.category?.name}</Badge>
                  </div>
                  {/* {isCreator && ( */}
                    <div className="creator-controls">
                      <Button variant="outline-primary" className="me-2" onClick={isDraft ? handleEditDraft : handleEditProject}>
                      <PencilIcon size={16} /> {isDraft ? 'Edit Draft' : 'Edit Project'}
                      </Button>
                      <Button variant="outline-primary" className="me-2">
                        <GiftIcon size={16} /> Add Reward
                      </Button>
                      <Button variant="outline-primary" className="me-2">
                        <BellIcon size={16} /> Post Update
                      </Button>
                      <Button variant="outline-secondary">
                        <Cog size={16} /> Manage Project
                      </Button>
                    </div>
                  {/* )} */}
                </div>

                <div className="d-flex justify-content-between align-items-center mt-4">
                  <div>
                    <h3>${project.current_amount?.toLocaleString()}</h3>
                    <p className="text-muted">raised of ${project.goal_amount?.toLocaleString()} goal</p>
                  </div>
                  <div>
                    <h3>{daysLeft}</h3>
                    <p className="text-muted">days left</p>
                  </div>
                  <div>
                    <Button 
                      variant="primary" 
                      size="lg"
                      onClick={() => navigate(`/projects/${id}/back`)}
                    >
                      Back This Project
                    </Button>
                  </div>
                </div>

                <ProgressBar now={percentFunded} className="my-4" />

                <div className="d-flex justify-content-between">
                  <Button variant="outline-primary">
                    <ShareIcon size={16} className="me-2" /> Share
                  </Button>
                  <Button variant="outline-secondary">
                    <BookmarkIcon size={16} className="me-2" /> Save
                  </Button>
                </div>
              </Card.Body>
            </Card>

            <Card className="mb-4">
              <Card.Body>
                {project.video_url && (
                  <div className="embed-responsive embed-responsive-16by9 mb-4">
                    <iframe 
                      className="embed-responsive-item" 
                      src={project.video_url}
                      allowFullScreen
                      title="Project video"
                    ></iframe>
                  </div>
                )}
                {project.image_url && (
                  <Image 
                    src={project.image_url} 
                    alt="Project main image" 
                    fluid 
                    className="mb-4"
                  />
                )}
              </Card.Body>
            </Card>

            <Tabs defaultActiveKey="overview" className="mb-4">
              <Tab eventKey="overview" title="Overview">
                <Card>
                  <Card.Body>
                    <div className="description" dangerouslySetInnerHTML={{ __html: project.description }} />
                    <h4>Risks & Challenges</h4>
                    <p className="description">{project.risk_and_challenges}</p>
                  </Card.Body>
                </Card>
              </Tab>
              {/* Other tabs remain the same */}
            </Tabs>
          </Col>

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
                      src={project.creator?.avatar_url || '/default-avatar.png'}
                      alt={project.creator?.name}
                    />
                  </Col>
                  <Col xs={9}>
                    <h6>{project.creator?.name}</h6>
                    <p className="text-muted">{project.creator?.bio}</p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="mb-4">
              <Card.Body>
                <h5>Rewards</h5>
                <div className="rewards-list">
                  {project.rewards?.length > 0 ? (
                    project.rewards.map((reward) => (
                      <div key={reward.id} className="reward-item border rounded p-3 mb-3">
                        <div className="d-flex justify-content-between">
                          <strong>{reward.title}</strong>
                          <span>${reward.amount}</span>
                        </div>
                        <p className="text-muted mb-2">{reward.description}</p>
                        <Button 
                          variant="outline-primary" 
                          className="w-100"
                          onClick={() => navigate(`/projects/${id}/back?reward=${reward.id}`)}
                        >
                          Select Reward
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p>No rewards available yet</p>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ProjectDetailsPage;