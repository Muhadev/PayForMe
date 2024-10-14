# app/services/notification_service.py

from app.models import Notification, User, Role
from app import db
from typing import List
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def create_admin_notification(message: str) -> List[Notification]:
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
                    user_id=admin.id
                )
                db.session.add(notification)
                notifications.append(notification)

            db.session.commit()
            logger.info(f"Created {len(notifications)} admin notifications")
            return notifications
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating admin notifications: {e}")
            return []

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
                notification.is_read = True
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