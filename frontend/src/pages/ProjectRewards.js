import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import RewardCard from './RewardCard';
import axiosInstance from '../helper/axiosConfig';
import { toast } from 'react-toastify';


const ProjectRewards = ({ project, rewards = [], canBackProject, isCreator, onEditReward, onRewardsUpdate  }) => {
  const navigate = useNavigate();

  const displayedRewards = rewards.slice(0, 2);
  const hasMoreRewards = rewards.length > 2;

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


  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Select a Reward</h5>
      </Card.Header>
      <Card.Body className="p-0">
        {displayedRewards.map(reward => (
          <RewardCard
            key={reward.id}
            reward={reward}
            canBackProject={canBackProject}
            isCreator={isCreator}
            onEditReward={onEditReward}
            onDeleteReward={() => handleDeleteReward(reward.id)}
          />
        ))}
        
        {hasMoreRewards && (
          <div className="p-3 text-center">
            <Button 
              variant="outline-primary"
              onClick={() => navigate(`/projects/${project.id}/rewards`)}
            >
              View All Rewards ({rewards.length})
            </Button>
          </div>
        )}
        
        {displayedRewards.length === 0 && (
          <div className="p-3 text-center text-muted">
            No rewards available yet.
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ProjectRewards;