import React, { useState, useEffect } from 'react';
import { Card, Spinner, Badge, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faCheck, faCommentDollar, faHeartbeat, faEdit, faUserPlus, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { api } from '../services/projectService';
import { formatTimeAgo } from '../utils/dateUtils'; // You'll need to create this utility

const getNotificationIcon = (type) => {
  switch (type) {
    case 'PROJECT_UPDATE':
      return faEdit;
    case 'DONATION':
      return faCommentDollar;
    case 'BACKER_JOINED':
      return faUserPlus;
    case 'GOAL_REACHED':
      return faHeartbeat;
    case 'ADMIN_REVIEW':
      return faExclamationCircle;
    default:
      return faBell;
  }
};

const getNotificationColor = (type) => {
  switch (type) {
    case 'PROJECT_UPDATE':
      return 'info';
    case 'DONATION':
      return 'success';
    case 'BACKER_JOINED':
      return 'primary';
    case 'GOAL_REACHED':
      return 'warning';
    case 'ADMIN_REVIEW':
      return 'danger';
    default:
      return 'secondary';
  }
};

const NotificationItem = ({ notification, onMarkAsRead }) => {
  const icon = getNotificationIcon(notification.type);
  const color = getNotificationColor(notification.type);
  
  return (
    <li className="notification-item py-2 px-1">
      <div className="d-flex align-items-start">
        <div className={`notification-icon me-3 bg-${color}-light p-2 rounded-circle`}>
          <FontAwesomeIcon icon={icon} className={`text-${color}`} />
        </div>
        <div className="notification-content flex-grow-1">
          <div className="d-flex justify-content-between">
            <p className="mb-1 notification-message">{notification.message}</p>
            {!notification.read_at && (
              <Badge 
                bg="primary" 
                className="ms-2" 
                style={{ height: 'fit-content' }}
              >
                New
              </Badge>
            )}
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">{formatTimeAgo(notification.created_at)}</small>
            {!notification.read_at && (
              <Button 
                variant="link" 
                size="sm" 
                className="p-0 text-muted" 
                onClick={() => onMarkAsRead(notification.id)}
              >
                <FontAwesomeIcon icon={faCheck} className="me-1" />
                Mark as read
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
};

const RecentActivityNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'unread'

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/v1/notifications/', {
        params: { unread_only: viewMode === 'unread' }
      });
      
      if (response.data && response.data.data && response.data.data.notifications) {
        setNotifications(response.data.data.notifications);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.post(`/api/v1/notifications/${notificationId}/read`);
      
      // Update the local state to reflect the change
      setNotifications(prevNotifications => 
        prevNotifications.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read_at: new Date().toISOString() } 
            : notif
        )
      );
      
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Set up polling to check for new notifications every minute
    const intervalId = setInterval(fetchNotifications, 60000);
    
    return () => clearInterval(intervalId);
  }, [viewMode]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  // Handle fallback for empty notifications
  const renderNotificationContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-4">
          <Spinner animation="border" variant="primary" size="sm" />
          <p className="mb-0 mt-2">Loading notifications...</p>
        </div>
      );
    }
    
    if (notifications.length === 0) {
      return (
        <div className="text-center py-4">
          <FontAwesomeIcon icon={faBell} className="text-muted mb-3" size="2x" />
          <p className="mb-0">No notifications yet</p>
          <p className="text-muted small">We'll notify you of important updates</p>
        </div>
      );
    }
    
    return (
      <ul className="list-unstyled mb-0">
        {notifications.map((notification) => (
          <NotificationItem 
            key={notification.id} 
            notification={notification}
            onMarkAsRead={handleMarkAsRead}
          />
        ))}
      </ul>
    );
  };

  return (
    <Card>
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            Recent Activity
            {unreadCount > 0 && (
              <Badge bg="danger" pill className="ms-2">
                {unreadCount}
              </Badge>
            )}
          </h5>
          <div className="btn-group" role="group">
            <Button 
              variant={viewMode === 'all' ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => setViewMode('all')}
            >
              All
            </Button>
            <Button 
              variant={viewMode === 'unread' ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => setViewMode('unread')}
            >
              Unread
            </Button>
          </div>
        </div>
      </Card.Header>
      <Card.Body className="notification-list p-0">
        {renderNotificationContent()}
      </Card.Body>
      {notifications.length > 5 && (
        <Card.Footer className="bg-white text-center">
          <Button variant="link" className="text-decoration-none">
            View All Notifications
          </Button>
        </Card.Footer>
      )}
    </Card>
  );
};

export default RecentActivityNotifications;