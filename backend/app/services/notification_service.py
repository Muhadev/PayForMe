# app/services/notification_service.py

from app.models import Notification, User, Role
from app import db
from typing import List
from enum import Enum
from datetime import datetime
import logging
from app.models.enums import NotificationType

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def create_notification(user_id: int, message: str, project_id: int = None) -> Notification:
        try:
            notification = Notification(
                user_id=user_id,
                # title=title,
                message=message,
                project_id=project_id,
                type=NotificationType.PROJECT_UPDATE,  # Assuming you have this type
                created_at=datetime.utcnow(),
                read_at=None
            )
            db.session.add(notification)
            db.session.commit()
            logger.info(f"Created notification for user {user_id}: {message}")
            return notification
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating notification: {e}")
            raise

    @staticmethod
    def create_admin_notification(message: str, project_id: int = None) -> List[Notification]:
        try:
            admin_role = Role.query.filter_by(name='Admin').first()
            if not admin_role:
                logger.warning("Admin role not found when creating notification")
                return []

            admin_users = User.query.filter(User.roles.contains(admin_role)).all()
            notifications = []

            for admin in admin_users:
                notification = Notification(
                    message=message,
                    user_id=admin.id,
                    type=NotificationType.ADMIN_REVIEW,  # Add the type
                    created_at=datetime.utcnow(),  # Add creation timestamp
                    project_id=project_id  # Add project_id reference
                )
                db.session.add(notification)
                notifications.append(notification)

            db.session.commit()
            logger.info(f"Created {len(notifications)} admin notifications")
            return notifications
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating admin notifications: {e}")
            raise  # Re-raise the exception to handle it in the calling function

    @staticmethod
    def get_user_notifications(user_id: int, unread_only: bool = False) -> List[Notification]:
        try:
            query = Notification.query.filter_by(user_id=user_id)
            if unread_only:
                query = query.filter_by(is_read=False)
            notifications = query.order_by(Notification.created_at.desc()).all()
            return notifications
        except Exception as e:
            logger.error(f"Error fetching notifications for user {user_id}: {e}")
            return []

    @staticmethod
    def mark_notification_as_read(notification_id: int) -> bool:
        try:
            notification = Notification.query.get(notification_id)
            if notification:
                notification.read_at = datetime.utcnow()  # Set timestamp when read
                db.session.commit()
                logger.info(f"Marked notification {notification_id} as read")
                return True
            else:
                logger.warning(f"Notification {notification_id} not found")
                return False
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error marking notification {notification_id} as read: {e}")
            return False