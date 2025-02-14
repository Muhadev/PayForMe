// ProjectDetailsPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, ProgressBar, Tabs, Tab, Badge, Alert, Image } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { 
  PencilIcon, GiftIcon, BellIcon, Cog, ShareIcon, BookmarkIcon, 
  Calendar, Users, Star, Clock, CheckCircle, XCircle, PlayCircle,
  ExternalLink, MapPin, MessageSquare
} from 'lucide-react';
import ShareModal from './ShareModal';
import axiosInstance from '../helper/axiosConfig';
import { shareProject, activateProject } from '../services/projectService';
import './ProjectDetailPage.css';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareInfo, setShareInfo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);
  const [isSaved, setIsSaved] = useState(false);


  // Add these calculations
  const calculateProjectMetrics = () => {
    if (!project) return { daysLeft: 0, percentFunded: 0 };
    
    // Calculate days left
    const endDate = new Date(project.end_date);
    const today = new Date();
    const timeLeft = endDate - today;
    const daysLeft = Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));

    // Calculate funding percentage
    const percentFunded = project.goal_amount 
      ? Math.min(100, (project.current_amount / project.goal_amount) * 100)
      : 0;

    return { daysLeft, percentFunded };
  };

  const { daysLeft, percentFunded } = calculateProjectMetrics();


  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setIsLoading(true);
        setError(null); // Reset error state
        
        // Check user role and draft status
        const userRole = localStorage.getItem('userRole');
        const userId = localStorage.getItem('userId');
        setIsAdmin(userRole === 'admin');
        const isDraftRoute = window.location.pathname.includes('/drafts/');
    
        // Fetch project data
        const response = await axiosInstance.get(
          isDraftRoute ? `/api/v1/projects/drafts/${id}` : `/api/v1/projects/${id}`
        );
        
        const projectData = response.data.data;
        setProject(projectData);
        setIsDraft(isDraftRoute);
        setIsCreator(projectData.creator_id === parseInt(userId));
    
        // Fetch creator profile with error handling
        if (projectData.creator_id) {
          try {
            const creatorResponse = await axiosInstance.get(`/api/v1/profile/${projectData.creator_id}/profile`);
            setProject(prev => ({
              ...prev,
              creator: creatorResponse.data.data.user
            }));
          } catch (error) {
            console.error('Error fetching creator profile:', error);
            // Set a default creator object or handle the error as needed
          }
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Failed to fetch project details';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectDetails();
  }, [id]);

  const handleVideoToggle = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleShare = async () => {
    try {
      const response = await shareProject(id);
      setShareInfo(response.data);
      setShowShareModal(true);
    } catch (error) {
      toast.error('Failed to generate share information');
    }
  };

  const handleSaveProject = async () => {
    try {
      await axiosInstance.post(`/api/v1/users/saved-projects/${id}`);
      setIsSaved(!isSaved);
      toast.success(isSaved ? 'Project removed from saved items' : 'Project saved successfully');
    } catch (error) {
      toast.error('Failed to save project');
    }
  };

  const handleProjectAction = async (action) => {
    try {
      const actions = {
        activate: () => activateProject(id),
        reject: () => axiosInstance.post(`/api/v1/projects/${id}/reject`),
        feature: () => axiosInstance.post(`/api/v1/projects/${id}/feature`)
      };

      await actions[action]();
      const actionMessages = {
        activate: 'Project activated successfully',
        reject: 'Project rejected',
        feature: project?.featured ? 'Project unfeatured' : 'Project featured'
      };

      toast.success(actionMessages[action]);
      
      // Refresh project data
      const response = await axiosInstance.get(`/api/v1/projects/${id}`);
      setProject(response.data.data);
    } catch (error) {
      toast.error(`Failed to ${action} project`);
    }
  };
  {isDraft && (
    <Alert variant="warning" className="mb-4">
      This project is currently under review and not yet visible to others.
    </Alert>
  )}
  // Render functions
  const renderHeaderSection = () => (
    <div className="project-header mb-4">
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={8}>
              <div className="d-flex align-items-center mb-3">
                <div>
                  <h1 className="display-5 mb-2">{project.title}</h1>
                  <p className="lead text-muted mb-3">{project.tagline}</p>
                  <div className="d-flex gap-2 flex-wrap">
                    <Badge bg="primary" className="badge-lg">{project.category?.name}</Badge>
                    {project.featured && <Badge bg="warning">Featured</Badge>}
                    <Badge bg={project.status === 'ACTIVE' ? 'success' : 'secondary'}>
                      {project.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </Col>
            <Col md={4} className="text-md-end">
              {(isCreator || isAdmin) && (
                <div className="creator-controls">
                  <Button variant="outline-primary" className="me-2">
                    <PencilIcon size={16} /> Edit
                  </Button>
                  <Button variant="outline-secondary">
                    <Cog size={16} /> Manage
                  </Button>
                </div>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );

  const renderMediaSection = () => (
    <div className="project-media mb-4">
      <Card className="border-0 shadow-sm overflow-hidden">
        {project.image_url && (
          <div className="project-image position-relative">
            <img
              src={project.image_url.startsWith('/uploads') 
                ? `${process.env.REACT_APP_BACKEND_URL}${project.image_url}`
                : project.image_url}
              alt={project.title}
              className="img-fluid w-100"
              style={{ maxHeight: '500px', objectFit: 'cover' }}
            />
          </div>
        )}

        {project.video_url && (
          <div className="project-video-container">
            {project.video_url.includes('youtube.com') || project.video_url.includes('vimeo.com') ? (
              <div className="embed-responsive embed-responsive-16by9">
                <iframe
                  src={project.video_url}
                  title="Project Video"
                  allowFullScreen
                  className="embed-responsive-item"
                />
              </div>
            ) : (
              <div className="position-relative">
                <video
                  ref={videoRef}
                  className="w-100"
                  controls
                  poster={project.image_url}
                >
                  <source src={project.video_url} type="video/mp4" />
                </video>
                <Button 
                  variant="primary" 
                  className="video-play-button"
                  onClick={handleVideoToggle}
                >
                  <PlayCircle size={48} />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );

  const renderProjectStats = () => (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Body>
        <Row className="text-center">
          <Col md={4} className="mb-3 mb-md-0">
            <h2 className="display-6">${project.current_amount?.toLocaleString() || 0}</h2>
            <p className="text-muted mb-0">of ${project.goal_amount?.toLocaleString() || 0} goal</p>
          </Col>
          <Col md={4} className="mb-3 mb-md-0">
            <h2 className="display-6">{project.backers_count || 0}</h2>
            <p className="text-muted mb-0">
              <Users size={16} className="me-1" />
              backers
            </p>
          </Col>
          <Col md={4}>
            <h2 className="display-6">{daysLeft}</h2>
            <p className="text-muted mb-0">
              <Clock size={16} className="me-1" />
              days to go
            </p>
          </Col>
        </Row>
        <ProgressBar 
          now={percentFunded} 
          className="mt-4"
          variant="success"
          style={{ height: '10px' }}
        />
      </Card.Body>
    </Card>
  );

  const renderCreatorInfo = () => (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Body>
        <h5 className="border-bottom pb-2 mb-3">About the Creator</h5>
        <div className="d-flex align-items-center">
          <Image
            src={project.creator?.profile_image || '/default-avatar.png'}
            alt={project.creator?.name}
            roundedCircle
            width={80}
            height={80}
            className="me-3 border"
          />
          <div>
            <h6 className="mb-1">{project.creator?.name}</h6>
            {project.creator?.location && (
              <p className="text-muted mb-2">
                <MapPin size={16} className="me-1" />
                {project.creator.location}
              </p>
            )}
            <Button 
              variant="link" 
              className="p-0 text-decoration-none"
              onClick={() => navigate(`/profile/${project.creator?.username}`)}
            >
              View Profile <ExternalLink size={16} />
            </Button>
          </div>
        </div>
        {project.creator?.bio && (
          <p className="mt-3 mb-0">{project.creator.bio}</p>
        )}
      </Card.Body>
    </Card>
  );

  const renderProjectContent = () => (
    <Tabs defaultActiveKey="overview" className="mb-4 nav-tabs-custom">
      <Tab eventKey="overview" title="Overview">
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <div 
              className="project-description mb-4"
              dangerouslySetInnerHTML={{ __html: project.description }}
            />
            
            <h4 className="border-bottom pb-2 mb-3">Risks and Challenges</h4>
            <div
              className="risks-description"
              dangerouslySetInnerHTML={{ __html: project.risks_and_challenges }}
            />
          </Card.Body>
        </Card>
      </Tab>
      <Tab eventKey="updates" title="Updates">
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4 text-center">
            <MessageSquare size={48} className="mb-3 text-muted" />
            <p className="text-muted">No updates yet</p>
          </Card.Body>
        </Card>
      </Tab>
      <Tab eventKey="comments" title="Comments">
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4 text-center">
            <MessageSquare size={48} className="mb-3 text-muted" />
            <p className="text-muted">No comments yet</p>
          </Card.Body>
        </Card>
      </Tab>
    </Tabs>
  );

  const renderRewards = () => (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <h5 className="border-bottom pb-2 mb-3">Select a Reward</h5>
        <div className="rewards-list">
          {project.rewards?.map((reward) => (
            <div 
              key={reward.id} 
              className="reward-item mb-3 p-3 border rounded hover-shadow"
            >
              <h6 className="text-primary mb-2">${reward.amount} or more</h6>
              <h5 className="mb-2">{reward.title}</h5>
              <p className="text-muted mb-3">{reward.description}</p>
              <Button 
                variant="outline-primary" 
                size="sm" 
                className="w-100"
                disabled={project.status !== 'ACTIVE'}
              >
                Select this reward
              </Button>
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  );

  if (isLoading) return (
    <div className="text-center p-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
  
  if (error) return <Alert variant="danger" className="m-4">{error}</Alert>;
  if (!project) return <Alert variant="warning" className="m-4">Project not found</Alert>;

  return (
    <div className="project-detail-page bg-light min-vh-100 py-4">
      <Container>
        {renderHeaderSection()}
        
        <Row>
          <Col lg={8}>
            
            {renderProjectStats()}
            {renderMediaSection()}
            {renderProjectContent()}
          </Col>
          
          <Col lg={4}>
            <div className="sticky-top" style={{ top: '20px' }}>
              {renderCreatorInfo()}
              {project.rewards?.length > 0 && renderRewards()}
            </div>
          </Col>
        </Row>

        <ShareModal 
          show={showShareModal}
          onHide={() => setShowShareModal(false)}
          shareInfo={shareInfo}
        />
      </Container>
    </div>
  );
};

export default ProjectDetailPage;