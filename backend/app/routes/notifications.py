from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.response import api_response
from app.utils.decorators import permission_required
from app.services.notification_service import NotificationService
import logging

logger = logging.getLogger(__name__)

role_permissions_bp = Blueprint('notifications', __name__)
@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_user_notifications():
    user_id = get_jwt_identity()
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    notifications = NotificationService.get_user_notifications(user_id, unread_only)
    return api_response(data={
        'notifications': [n.to_dict() for n in notifications]
    }, status_code=200)

@notifications_bp.route('/<int:notification_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_as_read(notification_id):
    success = NotificationService.mark_notification_as_read(notification_id)
    if success:
        return api_response(message="Notification marked as read", status_code=200)
    else:
        return api_response(message="Failed to mark notification as read", status_code=400)