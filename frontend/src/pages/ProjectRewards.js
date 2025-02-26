import React, { useState } from 'react';
import { Card, Button, Modal, Form  } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import RewardCard from './RewardCard';
import axiosInstance from '../helper/axiosConfig';
import { toast } from 'react-toastify';
import { backProject }  from '../services/stripeService.js';


const ProjectRewards = ({ project, rewards = [], canBackProject, isCreator, onEditReward, onRewardsUpdate  }) => {
  const navigate = useNavigate();
  const [showBackingModal, setShowBackingModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const availableRewards = rewards.filter(reward => {
    // Check remaining inventory
    const remaining = reward.inventory ? reward.inventory - (reward.backers_count || 0) : null;
    return remaining === null || remaining > 0;
  });

  const displayedRewards = availableRewards.slice(0, 2);
  const hasMoreRewards = availableRewards.length > 2;

  const handleDeleteReward = async (rewardId) => {
    try {
      const projectId = project.id || project;
      await axiosInstance.delete(`/api/v1/rewards/projects/${projectId}/rewards/${rewardId}`);
      
      // Immediately update local state to remove the deleted reward
      const updatedRewards = rewards.filter(reward => reward.id !== rewardId);
      // If you're using props.rewards directly, you'll need to update through the parent component
      if (typeof onRewardsUpdate === 'function') {
        onRewardsUpdate(updatedRewards);
      }
      
      toast.success('Reward deleted successfully');
    } catch (error) {
      console.error('Failed to delete reward:', error);
      toast.error('Failed to delete reward');
    }
  };
  const handleSelectReward = (reward) => {
    setSelectedReward(reward);
    setAmount(reward.minimum_amount);
    setShowBackingModal(true);
  };

  const handleBackProject = async () => {
    try {
      setIsProcessing(true);
      
      const response = await backProject(
        project.id, 
        parseFloat(amount), 
        selectedReward?.id
      );

      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        toast.error('Unable to process payment at this time');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to process backing';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <>
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Select a Reward</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {displayedRewards.length > 0 ? (
            displayedRewards.map(reward => (
              <RewardCard
                key={reward.id}
                reward={reward}
                canBackProject={canBackProject}
                isCreator={isCreator}
                onEditReward={onEditReward}
                onDeleteReward={handleDeleteReward}
                onSelectReward={handleSelectReward}
              />
            ))
          ) : (
            <div className="p-3 text-center text-muted">
              {rewards.length === 0 ? 
                "No rewards available yet." : 
                "All rewards have passed their estimated delivery date."}
            </div>
          )}
          
          {hasMoreRewards && displayedRewards.length > 0 && (
          <div className="p-3 text-center">
            <Button 
              variant="outline-primary"
              onClick={() => navigate(`/projects/${project.id}/rewards`)}
            >
              View All Available Rewards ({availableRewards.length})
            </Button>
          </div>
        )}
        </Card.Body>
      </Card>

      {/* Backing Modal */}
      <Modal show={showBackingModal} onHide={() => setShowBackingModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Back this project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReward && (
            <div className="selected-reward mb-4 p-3 bg-light rounded">
              <h6>{selectedReward.title}</h6>
              <p className="mb-2">{selectedReward.description}</p>
              <small className="text-muted">
                Estimated delivery: {new Date(selectedReward.estimated_delivery).toLocaleDateString()}
              </small>
            </div>
          )}
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Pledge Amount ($)</Form.Label>
              <Form.Control 
                type="number" 
                min={selectedReward ? selectedReward.minimum_amount : "1"} 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
              {selectedReward && (
                <Form.Text className="text-muted">
                  Minimum pledge for this reward is ${selectedReward.minimum_amount}
                </Form.Text>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBackingModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleBackProject}
            disabled={!amount || parseFloat(amount) < 1 || 
                     (selectedReward && parseFloat(amount) < selectedReward.minimum_amount) || 
                     isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Confirm Pledge'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ProjectRewards;