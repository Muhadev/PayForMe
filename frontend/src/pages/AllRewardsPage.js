// AllRewardsPage.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../helper/axiosConfig';
import EditRewardModal from './EditRewardModal'; // Adjust the path if needed
import RewardCard from './RewardCard';
import { toast } from 'react-toastify';


const AllRewardsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingReward, setEditingReward] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleEditReward = (reward) => {
    setEditingReward(reward);
    setShowEditModal(true);
  };

  const handleDeleteReward = async (rewardId) => {
    try {
      await axiosInstance.delete(`/api/v1/rewards/projects/${id}/rewards/${rewardId}`);
      
      // Update the rewards list after deletion
      setRewards(prevRewards => prevRewards.filter(r => r.id !== rewardId));
      toast.success('Reward deleted successfully');
    } catch (error) {
      console.error('Failed to delete reward:', error);
      toast.error('Failed to delete reward: ' + (error.response?.data?.message || 'Unknown error'));
    }
  };

  const handleRewardUpdated = (updatedReward) => {
    setRewards(prevRewards => 
      prevRewards.map(r => r.id === updatedReward.id ? updatedReward : r)
    );
    toast.success('Reward updated successfully');
  };
  
  
  useEffect(() => {
    const fetchProjectAndRewards = async () => {
      try {
        setIsLoading(true);
        
        // Fetch project basics
        const projectResponse = await axiosInstance.get(`/api/v1/projects/${id}`);
        const projectData = projectResponse.data.data;
        
        // if (projectData.image_url) {
        //   projectData.image_url = getMediaUrl(projectData.image_url);
        // }
        
        setProject(projectData);
        
        // Fetch rewards
        const rewardsResponse = await axiosInstance.get(`/api/v1/rewards/projects/${id}/rewards`);
        
        // Format the rewards data
        const formattedRewards = rewardsResponse.data.data.map(reward => ({
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
        const errorMessage = error.response?.data?.message || 'Failed to load project rewards';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProjectAndRewards();
  }, [id]);
  
  if (isLoading) return (
    <Container className="py-5">
      <div className="text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    </Container>
  );
  
  if (error) return (
    <Container className="py-5">
      <Alert variant="danger">{error}</Alert>
    </Container>
  );
  
  if (!project) return (
    <Container className="py-5">
      <Alert variant="warning">Project not found</Alert>
    </Container>
  );
  
  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-2">All Rewards</h1>
          <h2 className="h5 text-muted">{project.title}</h2>
        </div>
        <Button variant="outline-secondary" onClick={() => navigate(`/projects/${id}`)}>
          <i className="bi bi-arrow-left me-2"></i>
          Back to Project
        </Button>
      </div>
      
      {rewards.length === 0 ? (
        <Alert variant="info">
          This project doesn't have any rewards yet.
        </Alert>
      ) : (
        <Row>
          {rewards.map(reward => (
            <Col md={6} lg={4} className="mb-4" key={reward.id}>
              <RewardCard 
                reward={reward}
                canBackProject={project.status === 'ACTIVE'}
                isCreator={true}
                fullView={true}
                onEditReward={(reward) => handleEditReward(reward)} // Add this function
                onDeleteReward={(rewardId) => handleDeleteReward(rewardId)} // Add this functio
              />
            </Col>
          ))}
        </Row>
      )}
      {showEditModal && (
        <EditRewardModal
            show={showEditModal}
            onHide={() => setShowEditModal(false)}
            projectId={id}
            reward={editingReward}
            onRewardUpdated={handleRewardUpdated}
        />
        )}
    </Container>
  );
};

export default AllRewardsPage;