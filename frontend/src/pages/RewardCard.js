// RewardCard.js
import React from 'react';
import { Card, Button, Badge, ProgressBar } from 'react-bootstrap';
import { formatCurrency, formatDate } from '../utils/formatters';

const RewardCard = ({ 
  reward, 
  canBackProject, 
  isCreator, 
  onEditReward, 
  onDeleteReward,
  onSelectReward,
  fullView = false 
}) => {
  const remaining = reward.inventory ? reward.inventory - (reward.backers_count || 0) : null;
  const percentClaimed = reward.inventory 
    ? Math.min(100, Math.floor((reward.backers_count || 0) / reward.original_inventory * 100)) 
    : 0;
  
  const isSoldOut = remaining !== null && remaining <= 0;

  const isDeadlineApproaching = () => {
    const today = new Date();
    const deliveryDate = new Date(reward.estimated_delivery || reward.estimated_delivery_date);
    const diffTime = deliveryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Return true if less than 7 days remain
    return diffDays > 0 && diffDays <= 7;
  };
  
  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this reward?')) {
      // Call the delete handler and pass the reward ID
      onDeleteReward(reward.id);
    }
  };

  const handleBackWithReward = () => {
    if (onSelectReward && canBackProject && !isSoldOut) {
      onSelectReward(reward);
    }
  };
  
  return (
    <Card className={`reward-card mb-3 ${fullView ? '' : 'border-0 border-bottom rounded-0'}`}>
      <Card.Body>
        <div className="d-flex justify-content-between mb-2">
          <h5 className="mb-0">{formatCurrency(reward.amount)}</h5>
          {reward.is_digital && <Badge bg="info">Digital</Badge>}
        </div>
        
        <Card.Title>{reward.title}</Card.Title>
        <Card.Text>{reward.description}</Card.Text>
        
        {reward.inventory && (
          <div className="mb-3">
            <div className="d-flex justify-content-between mb-1">
              <small>
                {isSoldOut 
                  ? 'Sold Out!' 
                  : `${remaining} of ${reward.inventory} left`}
              </small>
              <small>{percentClaimed}% claimed</small>
            </div>
            <ProgressBar 
              now={percentClaimed} 
              variant={isSoldOut ? "danger" : "success"} 
            />
          </div>
        )}
        
        <div className="d-flex justify-content-between align-items-center mt-3">
          <small className="text-muted">
            Estimated delivery: {formatDate(reward.estimated_delivery)}
          </small>
          {isDeadlineApproaching() && (
            <Badge bg="warning" className="ms-2">Ending Soon</Badge>
          )}
          
          {reward.backers_count > 0 && (
            <small className="text-muted">
              {reward.backers_count} backer{reward.backers_count !== 1 ? 's' : ''}
            </small>
          )}
        </div>
        
        <div className="mt-3">
          {isCreator ? (
            <div className="d-flex gap-2">
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => onEditReward(reward)}
              >
                <i className="bi bi-pencil me-1"></i> Edit
              </Button>
              <Button 
                variant="outline-danger" 
                size="sm"
                onClick={handleDelete}
                disabled={reward.backers_count > 0}
              >
                <i className="bi bi-trash me-1"></i> Delete
              </Button>
            </div>
          ) : (
            <Button 
              variant="primary" 
              className="w-100"
              disabled={!canBackProject || isSoldOut}
              onClick={handleBackWithReward}
            >
              {isSoldOut ? 'Sold Out' : `Back for ${formatCurrency(reward.amount)}`}
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default RewardCard;