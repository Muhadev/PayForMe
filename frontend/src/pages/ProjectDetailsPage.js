import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, ProgressBar, Tabs, Tab, Badge, Alert, Image } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { 
  PencilIcon, GiftIcon, Video, BellIcon, Cog, ShareIcon, BookmarkIcon, 
  Calendar, Users, Star, Clock, CheckCircle, XCircle, PlayCircle,
  ExternalLink, MapPin, MessageSquare, AlertCircle, Award, Heart,
  Image as ImageIcon, Globe, Twitter
} from 'lucide-react';
// import jwtDecode from 'jwt-decode';
import { Modal } from 'react-bootstrap';
import ShareModal from './ShareModal';
import axiosInstance from '../helper/axiosConfig';
import RewardModal from './RewardModal';
import EditRewardModal from './EditRewardModal';
import ProjectRewards from './ProjectRewards';
import { shareProject, activateProject, saveProject, revokeProject, toggleProjectFeature, unsaveProject, getSavedProjects } from '../services/projectService';
import './ProjectDetailPage.css';
import { usePermission } from '../hooks/usePermission'

// Utility function to handle media URLs
const getMediaUrl = (url) => {
  if (!url) return null;
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  
  // If it's already an absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's a relative path starting with /uploads
  if (url.startsWith('/uploads/')) {
    return `${backendUrl}/api/v1/projects${url}`;
  }
  
  // If it's just a filename, construct the full path
  if (!url.startsWith('/')) {
    return `${backendUrl}/api/v1/projects/uploads/${url}`;
  }
  
  // Default case: append to backend URL
  return `${backendUrl}${url}`;
};

// Modular Components
const ProjectHeader = ({ project, navigate, handleRewardButtonClick, }) => {
  const { 
    canEditProject,
    canManageProject, 
    canAdministerProject 
  } = usePermission();

  return (

    <div className="project-header mb-4">
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={8}>
              <div className="d-flex align-items-center mb-3">
                <div>
                  <h1 className="display-5 mb-2">{project.title}</h1>
                  <div className="d-flex gap-2 flex-wrap">
                    <Badge bg="primary" className="badge-lg">{project.category?.name || 'Uncategorized'}</Badge>
                    {canAdministerProject(project) && (
                        <Badge bg={project.featured ? "warning" : "secondary"}>
                          {project.featured ? "Featured" : "Not Featured"}
                        </Badge>
                      )}
                    <Badge bg={project.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {project.status || 'DRAFT'}
                    </Badge>
                  </div>
                </div>
              </div>
            </Col>
            <Col md={4} className="text-md-end">
              {/* Show edit/manage buttons for both creator and admin */}
              {canEditProject(project) && (
                <div className="creator-controls">
                  <Button 
                    variant="outline-primary" 
                    className="me-2"
                    onClick={() => navigate(`/projects/edit/${project.id}`)}
                  >
                    <PencilIcon size={16} className="me-1" /> Edit
                  </Button>
                  {canManageProject(project) && (
                    <>
                  {/* <Button 
                    variant="outline-secondary"
                    onClick={() => navigate(`/projects/manage/${project.id}`)}
                  >
                    <Cog size={16} className="me-1" /> Manage
                  </Button> */}
                  <Button 
                    variant="outline-success"
                    onClick={handleRewardButtonClick}
                  >
                    <GiftIcon size={16} className="me-1" /> Rewards
                  </Button>
                  </>
                  )}
                </div>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

const ProjectMedia = ({ project, videoRef, isPlaying, handleVideoToggle, activeMedia, setActiveMedia }) => {
  // State to track active media type
  // const [activeMedia, setActiveMedia] = useState('image');
  
  // Only show tabs if both image and video exist
  const showMediaTabs = project.image_url && project.video_url;
  
  // Set default active media based on what's available
  useEffect(() => {
    if (project.image_url) {
      setActiveMedia('image');
    } else if (project.video_url) {
      setActiveMedia('video');
    }
  }, [project.image_url, project.video_url]);
  
  return (
    <div className="project-media mb-4">
      <Card className="border-0 shadow-sm overflow-hidden">
        {/* Media Selector Tabs - only shown if both media types exist */}
        {showMediaTabs && (
          <div className="media-tabs">
            <div className="btn-group w-100">
              <Button 
                variant={activeMedia === 'image' ? 'primary' : 'light'}
                className={`media-tab-btn ${activeMedia === 'image' ? 'active' : ''}`}
                onClick={() => setActiveMedia('image')}
              >
                <ImageIcon size={16} className="me-2" />
                Project Image
              </Button>
              <Button 
                variant={activeMedia === 'video' ? 'primary' : 'light'}
                className={`media-tab-btn ${activeMedia === 'video' ? 'active' : ''}`}
                onClick={() => setActiveMedia('video')}
              >
                <Video size={16} className="me-2" />
                Project Video
              </Button>
            </div>
          </div>
        )}
        
        {/* Image Content */}
        {project.image_url && activeMedia === 'image' && (
          <div className="project-image-container">
            <img
              src={getMediaUrl(project.image_url)}
              alt={project.title}
              className="img-fluid w-100"
            />
          </div>
        )}

        {/* Video Content */}
        {project.video_url && activeMedia === 'video' && (
          <div className="project-video-container">
            {project.video_url.includes('youtube.com') || project.video_url.includes('youtu.be') || 
             project.video_url.includes('vimeo.com') ? (
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
                  poster={project.image_url ? getMediaUrl(project.image_url) : undefined}
                >
                  <source src={getMediaUrl(project.video_url)} type="video/mp4" />
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
        
        {/* Show a placeholder if no media available */}
        {!project.image_url && !project.video_url && (
          <div className="no-media-placeholder">
            <div className="text-center py-5">
              <ImageIcon size={48} className="text-muted mb-3" />
              <p className="text-muted">No media available for this project</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

const ProjectStats = ({ project, daysLeft, percentFunded, handleShare, isSaved, handleSaveProject, canBackProject, isCreator }) => (
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
      <div className="d-flex justify-content-between mt-4">
        {canBackProject() && (
              <Button variant="primary" size="lg" className="btn-back-project">
                <GiftIcon size={18} className="me-2" />
                Back This Project
              </Button>
            )}
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={handleShare}>
            <ShareIcon size={16} className="me-1" />
            Share
          </Button>
          {!isCreator && (
              <Button 
                variant={isSaved ? "outline-success" : "outline-secondary"}
                onClick={handleSaveProject}
              >
                <BookmarkIcon size={16} className="me-1" />
                {isSaved ? 'Saved' : 'Save'}
              </Button>
            )}
        </div>
      </div>
    </Card.Body>
  </Card>
);

const CreatorInfo = ({ project }) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  return (
    <>
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white border-bottom pb-2">
          <h5 className="mb-0">
            <Users size={16} className="me-2 text-primary" />
            About the Creator
          </h5>
        </Card.Header>
        <Card.Body>
          <div className="d-flex align-items-center mb-3">
            <Image
              src={project.creator?.profile_image || '/default-avatar.png'}
              alt={project.creator?.name || 'Creator'}
              roundedCircle
              width={64}
              height={64}
              className="me-3 border"
            />
            <div>
              <h6 className="mb-1">{project.creator?.full_name || project.creator?.name || 'Anonymous Creator'}</h6>
              {project.creator?.location && (
                <p className="text-muted mb-0 small">
                  <MapPin size={14} className="me-1" />
                  {project.creator.location}
                </p>
              )}
            </div>
          </div>
          
          {project.creator?.bio && (
            <p className="text-muted small mb-3">
              {project.creator.bio.length > 120 
                ? project.creator.bio.substring(0, 120) + '...' 
                : project.creator.bio}
            </p>
          )}
          
          <div className="creator-stats d-flex justify-content-between mb-3">
            <div className="text-center">
              <h6 className="mb-0">{project.creator?.projects_created_count || 0}</h6>
              <p className="text-muted small mb-0">Created</p>
            </div>
            <div className="text-center">
              <h6 className="mb-0">{project.creator?.backed_projects_count || 0}</h6>
              <p className="text-muted small mb-0">Backed</p>
            </div>
            <div className="text-center">
              <h6 className="mb-0">{project.creator?.join_date ? 
                new Date(project.creator.join_date).getFullYear() : 'N/A'}</h6>
              <p className="text-muted small mb-0">Joined</p>
            </div>
          </div>
          
          <Button 
            variant="link" 
            className="p-0 text-decoration-none mt-2"
            onClick={() => setShowProfileModal(true)}
          >
            View more about this creator <ExternalLink size={14} className="ms-1" />
          </Button>
        </Card.Body>
      </Card>
      
      {/* Profile Modal */}
      <Modal 
        show={showProfileModal} 
        onHide={() => setShowProfileModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>About {project.creator?.full_name || 'the Creator'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-4">
            <Image
              src={project.creator?.profile_image || '/default-avatar.png'}
              alt={project.creator?.name || 'Creator'}
              roundedCircle
              width={120}
              height={120}
              className="mb-3 border"
            />
            <h5>{project.creator?.full_name || project.creator?.name || 'Anonymous Creator'}</h5>
            {project.creator?.location && (
              <p className="text-muted">
                <MapPin size={16} className="me-1" />
                {project.creator.location}
              </p>
            )}
          </div>
          
          <div className="creator-stats d-flex justify-content-center gap-4 mb-4">
            <div className="text-center">
              <h6>{project.creator?.projects_created_count || 0}</h6>
              <p className="text-muted small">Projects Created</p>
            </div>
            <div className="text-center">
              <h6>{project.creator?.backed_projects_count || 0}</h6>
              <p className="text-muted small">Projects Backed</p>
            </div>
            <div className="text-center">
              <h6>{project.creator?.join_date ? 
                new Date(project.creator.join_date).getFullYear() : 'N/A'}</h6>
              <p className="text-muted small">Joined</p>
            </div>
          </div>
          
          {project.creator?.bio && (
            <div className="mb-4">
              <h6 className="border-bottom pb-2 mb-2">Bio</h6>
              <p>{project.creator.bio}</p>
            </div>
          )}
          
          {(project.creator?.website || project.creator?.twitter) && (
            <div className="creator-links">
              <h6 className="border-bottom pb-2 mb-2">Links</h6>
              <div className="d-flex flex-column gap-2">
                {project.creator?.website && (
                  <a href={project.creator.website} target="_blank" rel="noopener noreferrer" 
                     className="text-decoration-none">
                    <Globe size={16} className="me-2" />
                    {project.creator.website}
                  </a>
                )}
                {project.creator?.twitter && (
                  <a href={`https://twitter.com/${project.creator.twitter}`} target="_blank" 
                     rel="noopener noreferrer" className="text-decoration-none">
                    <Twitter size={16} className="me-2" />
                    @{project.creator.twitter}
                  </a>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

const ProjectContent = ({ project, isCreator }) => (
  <Tabs defaultActiveKey="overview" className="mb-4 nav-tabs-custom">
    <Tab eventKey="overview" title="Overview">
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <h4 className="border-bottom pb-2 mb-3">
            Description
          </h4>
          <div 
            className="project-description mb-4"
            dangerouslySetInnerHTML={{ __html: project.description || '<p>No description provided.</p>' }}
          />
          
          <h4 className="border-bottom pb-2 mb-3">
            <AlertCircle size={20} className="me-2 text-warning" />
            Risks and Challenges
          </h4>
          <div
            className="risks-description"
            dangerouslySetInnerHTML={{ 
              __html: project.risks_and_challenges || project.risk_and_challenges || 
                    '<p>No risks or challenges have been provided by the creator.</p>' 
            }}
          />
          
          {/* Project Timeline */}
          <h4 className="border-bottom pb-2 mb-4 mt-5">
            <Calendar size={20} className="me-2 text-primary" />
            Project Timeline
          </h4>
          <Row className="mb-4">
            <Col md={6}>
              <h6>Start Date</h6>
              <p>{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not specified'}</p>
            </Col>
            <Col md={6}>
              <h6>End Date</h6>
              <p>{project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not specified'}</p>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Tab>
    <Tab eventKey="updates" title="Updates">
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4 text-center">
          <MessageSquare size={48} className="mb-3 text-muted" />
          <p className="text-muted">No updates yet</p>
          {isCreator && (
            <Button variant="outline-primary" size="sm">
              Post an Update
            </Button>
          )}
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

const AdminControls = ({ project, handleProjectAction }) => (
  <Card className="border-0 shadow-sm mb-4">
    <Card.Body>
      <h5 className="mb-3">Admin Controls</h5>
      <div className="d-flex gap-3 flex-wrap">
        {project.status !== 'ACTIVE' && (
          <Button 
            variant="success" 
            onClick={() => handleProjectAction('activate')}
          >
            <CheckCircle className="me-2" size={18} />
            Activate Project
          </Button>
        )}
        {project.status === 'ACTIVE' && (
          <Button 
            variant="danger" 
            onClick={() => handleProjectAction('revoke')}
          >
            <XCircle className="me-2" size={18} />
            Reject Project
          </Button>
        )}
        <Button 
          variant={project.featured ? "warning" : "primary"}
          onClick={() => handleProjectAction('feature')}
        >
          <Star className="me-2" size={18} />
          {project.featured ? 'Unfeature Project' : 'Feature Project'}
        </Button>
      </div>
      {/* Status indicator */}
      <div className="mt-3 pt-3 border-top">
        <div className="d-flex align-items-center gap-2">
          <strong>Current Status:</strong>
          <Badge bg={
            project.status === 'ACTIVE' ? 'success' :
            project.status === 'REJECTED' ? 'danger' :
            'warning'
          }>
            {project.status}
          </Badge>
        </div>
        {project.featured && (
          <div className="mt-2">
            <Badge bg="warning">Featured Project</Badge>
          </div>
        )}
      </div>
    </Card.Body>
  </Card>
);
// ProjectDetailsPage.js
// Main Component
const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDraft, setIsDraft] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareInfo, setShareInfo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);
  const [isSaved, setIsSaved] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [activeMedia, setActiveMedia] = useState('image');

  // Add new state for reward modal
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewards, setRewards] = useState([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);

  const handleEditReward = (reward) => {
    setSelectedReward(reward);
    setShowEditModal(true);
  };

  const handleRewardUpdated = (updatedReward) => {
    // Update your rewards list with the updated reward
    setRewards(prevRewards => 
      prevRewards.map(r => r.id === updatedReward.id ? updatedReward : r)
    );
    toast.success('Reward updated successfully!');
  };

  // const { 
  //   hasRole, 
  //   isProjectCreator, 
  //   canEditProject: hookCanEditProject, 
  //   canManageProject: hookCanManageProject,
  //   isLoaded,
  //   fetchProjectRoles 
  // } = usePermission();

  const { 
    hasRole, 
    permissions, 
    isProjectCreator, 
    canEditProject: hookCanEditProject, 
    canManageProject: hookCanManageProject,
    isLoaded,
    fetchProjectRoles,
    projectRoles
  } = usePermission();

  // Function to handle Reward button click
  const handleRewardButtonClick = () => {
    setShowRewardModal(true);
  };

  // In fetchProjectRewards function
  const fetchProjectRewards = async () => {
    if (!project?.id) return;
    
    try {
      const response = await axiosInstance.get(`/api/v1/rewards/projects/${project.id}/rewards`);
      
      // Format the rewards data to match the expected structure
      const formattedRewards = response.data.data.map(reward => ({
        id: reward.id,
        title: reward.title,
        description: reward.description,
        amount: reward.minimum_amount,
        inventory: reward.quantity_available,
        estimated_delivery: reward.estimated_delivery_date,
        is_digital: reward.shipping_type === 'none',
        backers_count: reward.quantity_claimed || 0,
        original_inventory: reward.quantity_available
      }));
      
      setRewards(formattedRewards);
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
      toast.error('Failed to load project rewards');
    }
  };
  
  const handleRewardCreated = (newReward) => {
    // Add the new reward to the existing rewards array
    setRewards(prevRewards => [newReward, ...prevRewards]);
    toast.success(`Reward "${newReward.title}" created successfully!`);
    setShowRewardModal(false);
  };

  useEffect(() => {
    if (project?.id) {
      fetchProjectRewards();
    }
  }, [project?.id]);

  // Then define hasPermission as a function using the permissions array:
  const hasPermission = (permissionToCheck) => {
    return permissions.includes(permissionToCheck);
  };

  // Derived state using hook functions
  const isAdmin = hasRole('Admin');
  // const isCreator = project ? isProjectCreator(project) : false;
  // const isUser = !isAdmin && !isCreator;

  const isCreator = useMemo(() => {
    return project ? isProjectCreator(project) : false;
  }, [project, projectRoles[project?.id]]);
  
  // Fix the permission check functions
  const canEditProject = useCallback(() => {
    return project && hookCanEditProject(project);
  }, [project, projectRoles[project?.id]]);
  
  const canManageProject = useCallback(() => {
    return project && hookCanManageProject(project);
  }, [project, projectRoles[project?.id]]);

  // Function to check if user can back project
  const canBackProject = () => {
    return project?.status === 'ACTIVE' && !isCreator;
  };

  useEffect(() => {
    if (project?.id) {
      fetchProjectRoles(project.id);
    }
  }, [project?.id]);

  // Check specific permissions
  const canViewProject = () => {
    return hasPermission('view_projects') || isAdmin || isCreator;
  };

  const canCreateReward = () => {
    return hasPermission('create_reward') && (isCreator || isAdmin);
  };

  // Pass these functions to child components
  const projectHeaderProps = {
    project,
    isCreator,
    isAdmin,
    canEditProject: canEditProject,
    canManageProject: canManageProject,
    navigate,
    handleRewardButtonClick,
  };

  useEffect(() => {
    // Only update activeMedia if project data has been loaded
    if (project && Object.keys(project).length > 0) {
      if (project.video_url) {
        setActiveMedia('video');
      } else if (project.image_url) {
        setActiveMedia('image');
      }
    }
  }, [project]);

  // Calculate project metrics
  const calculateProjectMetrics = () => {
    if (!project) return { daysLeft: 0, percentFunded: 0 };
    
    // Calculate days left
    const endDate = new Date(project.end_date);
    const today = new Date();
    const timeLeft = endDate - today;
    const daysLeft = Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));

    // Calculate funding percentage
    const percentFunded = project.goal_amount 
      ? Math.min(100, ((project.current_amount || 0) / project.goal_amount) * 100)
      : 0;

    return { daysLeft, percentFunded };
  };

  const { daysLeft, percentFunded } = calculateProjectMetrics();

  // useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
  
        // Check if we're viewing a draft
        const isDraftRoute = window.location.pathname.includes('/drafts/');
    
        // Fetch project data
        const response = await axiosInstance.get(
          isDraftRoute ? `/api/v1/projects/drafts/${id}` : `/api/v1/projects/${id}`
        );
        
        const projectData = response.data.data;

        console.log("Project data:", projectData);
        console.log("Featured status:", projectData.featured);
        // Properly handle media URLs
        if (projectData.image_url) {
          projectData.image_url = getMediaUrl(projectData.image_url);
        }
        
        if (projectData.video_url) {
          projectData.video_url = getMediaUrl(projectData.video_url);
        }
        
        // Handle creator profile image if it exists
        if (projectData.creator && projectData.creator.profile_image) {
          projectData.creator.profile_image = getMediaUrl(projectData.creator.profile_image);
        }

        setProject(projectData);
        setIsDraft(isDraftRoute);
    
        // Try to get category information if needed
        if (projectData.category_id && !projectData.category) {
          try {
            const categoryRes = await axiosInstance.get('/api/v1/categories/');
            const categories = categoryRes.data.data;
            const category = categories.find(c => c.id === projectData.category_id);
            
            if (category) {
              setProject(prev => ({
                ...prev,
                category
              }));
            }
          } catch (err) {
            console.error('Failed to fetch category:', err);
          }
        }

        // If creator info is incomplete, fetch additional profile details
        // If creator info is incomplete, fetch additional profile details
        if (projectData.creator_id && (!projectData.creator || !projectData.creator.full_name)) {
          try {
            const creatorRes = await axiosInstance.get(`/api/v1/profile/${projectData.creator_id}`);
            const creatorData = creatorRes.data.data.user;
            
            // Filter out sensitive fields if necessary
            const filteredCreatorData = {
              id: creatorData.id,
              full_name: creatorData.full_name,
              username: creatorData.username,
              location: creatorData.location,
              bio: creatorData.bio,
              website: creatorData.website,
              twitter: creatorData.twitter,
              profile_image: creatorData.profile_image,
              projects_created_count: creatorData.projects_created_count,
              backed_projects_count: creatorData.backed_projects_count,
              join_date: creatorData.created_at,
            };
            
            // Update project with creator data
            setProject(prev => ({
              ...prev,
              creator: {
                ...prev.creator,
                ...filteredCreatorData,
                profile_image: filteredCreatorData.profile_image ? 
                  getMediaUrl(filteredCreatorData.profile_image) : 
                  prev.creator?.profile_image
              }
            }));
          } catch (err) {
            console.error('Failed to fetch creator details:', err);
          }
        }
        
        try {
          const savedProjectsResponse = await getSavedProjects();
          const savedProjectIds = savedProjectsResponse.data.projects.map(p => p.id);
          setIsSaved(savedProjectIds.includes(parseInt(id)));
        } catch (err) {
          console.error('Failed to fetch saved projects status:', err);
          // Fallback to not saved
          setIsSaved(false);
        }
        
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Failed to fetch project details';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

  //   fetchProjectDetails();
  // }, [id]);



  useEffect(() => {
    // Only fetch project data once permission data is loaded
    if (isLoaded) {
      fetchProjectDetails();
    }
  }, [id, isLoaded]);

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
      // Call the backend share endpoint
      const response = await shareProject(id);
      
      // If the backend returns social links, use them
      if (response && response.data) {
        setShareInfo(response.data);
      } else {
        // Fallback if backend doesn't return expected data
        const shareUrl = window.location.href;
        const encodedUrl = encodeURIComponent(shareUrl);
        
        const shareData = {
          url: shareUrl,
          social_links: {
            twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(project.title)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
          }
        };
        
        setShareInfo(shareData);
      }
      
      setShowShareModal(true);
    } catch (error) {
      console.error('Share error:', error);
      
      // Fallback if API call fails
      const shareUrl = window.location.href;
      const encodedUrl = encodeURIComponent(shareUrl);
      
      const fallbackShareData = {
        url: shareUrl,
        social_links: {
          twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(project.title)}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
        }
      };
      
      setShareInfo(fallbackShareData);
      setShowShareModal(true);
      toast.warning('Using local share links - some features may be limited');
    }
  };

  const handleSaveProject = async () => {
    try {
      if (isSaved) {
        // Unsave the project
        await unsaveProject(id);
        setIsSaved(false);
        toast.success('Project removed from saved items');
      } else {
        // Save the project
        await saveProject(id);
        setIsSaved(true);
        toast.success('Project saved successfully');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to save/unsave project';
      toast.error(errorMessage);
      console.error('Save project error:', error);
    }
  };

  // In your API calls:
  const handleProjectAction = async (action) => {
    try {
      let response;
      
      switch (action) {
        case 'activate':
          response = await activateProject(id);
          break;
        case 'revoke':
          response = await revokeProject(id);
          break;
        case 'feature':
          response = await toggleProjectFeature(id);
          break;
        default:
          throw new Error('Invalid action');
      }

      if (response.data) {
        // Update the project state with the new data
        setProject(prev => ({
          ...prev,
          ...response.data,
          status: action === 'activate' ? 'ACTIVE' : 
                 action === 'revoke' ? 'REJECTED' : 
                 prev.status,
          featured: action === 'feature' ? !prev.featured : prev.featured
        }));

        // Show success message
        toast.success(
          action === 'activate' ? 'Project activated successfully' :
          action === 'revoke' ? 'Project revoked successfully' :
          action === 'feature' ? `Project ${response.data.featured ? 'featured' : 'unfeatured'} successfully` :
          'Action completed successfully'
        );
      }
    } catch (error) {
      // Handle errors
      const errorMessage = error.response?.data?.message || `Failed to ${action} project`;
      toast.error(errorMessage);
      console.error(`Project ${action} error:`, error);
    }
  };

  const refreshRewards = (updatedRewards) => {
    if (updatedRewards) {
      // If we already have the updated rewards array, use it directly
      setRewards(updatedRewards);
    } else {
      // Otherwise fetch fresh data
      fetchProjectRewards();
    }
  };
 
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
      {project.status === 'PENDING' && (isCreator || isAdmin) && (
          <Alert variant="warning" className="mb-4">
            This project is currently under review and not yet visible to others.
          </Alert>
        )}
        
        {project && <ProjectHeader {...projectHeaderProps} />}
        
        {isAdmin && (
          <AdminControls 
            project={project} 
            handleProjectAction={handleProjectAction}
          />
        )}
        
        <Row>
          <Col lg={8}>

          <ProjectStats 
              project={project}
              daysLeft={daysLeft}
              percentFunded={percentFunded}
              handleShare={handleShare}
              isSaved={isSaved}
              handleSaveProject={handleSaveProject}
              canBackProject={canBackProject}
              isCreator={isCreator}
            />
            <ProjectMedia 
              project={project}
              videoRef={videoRef}
              isPlaying={isPlaying}
              handleVideoToggle={handleVideoToggle}
              activeMedia={activeMedia}
              setActiveMedia={setActiveMedia}
            />
            <ProjectContent 
              project={project} 
              isCreator={isCreator}
              canCreateReward={canCreateReward()}
            />
          </Col>
          
          <Col lg={4}>
          <div className="sticky-top" style={{ top: '20px' }}>
              <CreatorInfo project={project} navigate={navigate} />
              <ProjectRewards 
                project={project}
                rewards={rewards}
                canBackProject={canBackProject()}
                isCreator={isCreator}
                onEditReward={handleEditReward}
                onRewardsUpdate={refreshRewards}
              />
            </div>
          </Col>
        </Row>

        <ShareModal 
          show={showShareModal}
          onHide={() => setShowShareModal(false)}
          shareInfo={shareInfo}
        />

         {/* Reward Creation Modal */}
         <RewardModal
          show={showRewardModal}
          onHide={() => setShowRewardModal(false)}
          projectId={project?.id}
          onRewardCreated={handleRewardCreated}
        />

        {showEditModal && (
          <EditRewardModal
            show={showEditModal}
            onHide={() => setShowEditModal(false)}
            projectId={project?.id}
            reward={selectedReward}
            onRewardUpdated={handleRewardUpdated}
          />
        )}
      </Container>
    </div>
  );
};

export default ProjectDetailPage;