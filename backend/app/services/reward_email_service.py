from typing import List, Dict, Any, Optional
from datetime import datetime, date
import logging
from dataclasses import dataclass
from app.services.email_service import send_templated_email

logger = logging.getLogger(__name__)

@dataclass
class EmailContext:
    """Data class to hold email template context"""
    template_type: str
    context: Dict[str, Any]

class RewardEmailService:
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    @staticmethod
    def format_value(value: Any) -> str:
        """Format various types of values for email display"""
        if isinstance(value, datetime):
            return value.strftime('%Y-%m-%d')
        if isinstance(value, date):
            return value.strftime('%Y-%m-%d')
        if value is None:
            return "Not specified"
        if isinstance(value, float):
            return f"${value:,.2f}"
        return str(value)

    def format_changes(self, changes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format changes for email notification"""
        formatted_changes = []
        field_labels = {
            'title': 'Title',
            'description': 'Description',
            'minimum_amount': 'Minimum Amount',
            'quantity_available': 'Quantity Available',
            'estimated_delivery_date': 'Estimated Delivery Date',
            'shipping_type': 'Shipping Type'
        }
        
        for change in changes:
            field = change['field']
            formatted_changes.append({
                'field': field_labels.get(field, field.replace('_', ' ').title()),
                'old': self.format_value(change['old']),
                'new': self.format_value(change['new'])
            })
        return formatted_changes

    def _get_user_display_name(self, user: 'User') -> str:
        """Get the best available display name for a user"""
        if user.full_name:
            return user.full_name
        return user.username

    def _check_delivery_impact(self, changes: List[Dict[str, Any]]) -> Optional[str]:
        """Check if changes affect delivery and return appropriate message"""
        for change in changes:
            if change['field'] == 'estimated_delivery_date':
                old_date = datetime.strptime(change['old'], '%Y-%m-%d') if change['old'] != "Not specified" else None
                new_date = datetime.strptime(change['new'], '%Y-%m-%d') if change['new'] != "Not specified" else None
                
                if old_date and new_date:
                    if new_date > old_date:
                        days_diff = (new_date - old_date).days
                        return f"The estimated delivery date has been delayed by {days_diff} days. We apologize for any inconvenience."
                    elif new_date < old_date:
                        days_diff = (old_date - new_date).days
                        return f"Good news! The estimated delivery date has been moved up by {days_diff} days."
            elif change['field'] == 'shipping_type':
                return f"The shipping method has been updated from {change['old']} to {change['new']}. This may affect delivery timing."
        
        return None

    def _send_safe(self, email_context: EmailContext, recipient_email: str, recipient_name: Optional[str] = None) -> bool:
        """
        Safely send an email with comprehensive error handling and logging
        
        Args:
            email_context: EmailContext object containing template and context
            recipient_email: Email address of the recipient
            recipient_name: Optional name of the recipient for logging
        
        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        try:
            result = send_templated_email(
                to_email=recipient_email,
                email_type=email_context.template_type,
                **email_context.context
            )
            if result:
                self.logger.info(
                    f"Successfully sent {email_context.template_type} email to {recipient_name or recipient_email}"
                )
                return True
            else:
                self.logger.error(
                    f"Failed to send {email_context.template_type} email to {recipient_name or recipient_email}"
                )
                return False
        except Exception as e:
            self.logger.error(
                f"Error sending {email_context.template_type} email to {recipient_name or recipient_email}: {str(e)}",
                exc_info=True
            )
            return False

    def notify_project_followers(self, project: 'Project', reward: 'Reward') -> None:
        """Send notifications to project followers about new reward"""
        followers = getattr(project, 'followers', None)
        if not followers:
            self.logger.debug(f"No followers found for project {project.id}")
            return

        for follower in followers:
            email_context = EmailContext(
                template_type='new_reward_available',
                context={
                    'user_name': self._get_user_display_name(follower),
                    'project_title': project.title,
                    'reward_title': reward.title,
                    'reward_description': reward.description,
                    'minimum_amount': reward.minimum_amount
                }
            )
            self._send_safe(email_context, follower.email, self._get_user_display_name(follower))

    def notify_reward_creation(self, project: 'Project', reward: 'Reward') -> None:
        """Send notification when a new reward is created"""
        # Notify project creator
        creator_context = EmailContext(
            template_type='reward_created',
            context={
                'project_title': project.title,
                'reward_title': reward.title,
                'reward_description': reward.description,
                'minimum_amount': reward.minimum_amount,
                'estimated_delivery': reward.estimated_delivery_date,
                'quantity_available': reward.quantity_available
            }
        )
        
        creator_name = self._get_user_display_name(project.creator)
        if self._send_safe(creator_context, project.creator.email, creator_name):
            # Only attempt to notify followers if creator notification was successful
            try:
                self.notify_project_followers(project, reward)
            except Exception as e:
                self.logger.error(f"Error in follower notifications for project {project.id}: {str(e)}")

    def notify_reward_update(self, project: 'Project', reward: 'Reward', changes: List[Dict[str, Any]]) -> None:
        """Send reward update notifications to all relevant users with enhanced context"""
        if not changes:
            self.logger.info("No changes to notify about")
            return

        formatted_changes = self.format_changes(changes)
        delivery_impact = self._check_delivery_impact(changes)
        update_timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Base context that's common for all recipients
        base_context = {
            'project_title': project.title,
            'reward_title': reward.title,
            'changes': formatted_changes,
            'project_url': f"/projects/{project.id}",  # Adjust based on your URL structure
            'reward_id': str(reward.id),
            'update_timestamp': update_timestamp,
            'current_year': datetime.now().year
        }

        if delivery_impact:
            base_context['delivery_impact'] = delivery_impact

        # Notify project creator
        creator_name = self._get_user_display_name(project.creator)
        creator_context = EmailContext(
            template_type='reward_updated',
            context={
                **base_context,
                'user_name': creator_name,
                'is_creator': True
            }
        )
        self._send_safe(creator_context, project.creator.email, creator_name)
        
        # Notify claimed users
        claimed_users = getattr(reward, 'claimed_by', [])
        if claimed_users:
            for user in claimed_users:
                user_name = self._get_user_display_name(user)
                user_context = EmailContext(
                    template_type='reward_updated',
                    context={
                        **base_context,
                        'user_name': user_name,
                        'is_creator': False
                    }
                )
                self._send_safe(user_context, user.email, user_name)
        else:
            self.logger.debug(f"No claimed users found for reward {reward.id}")

        # Notify project followers
        followers = getattr(project, 'followers', [])
        if followers:
            for follower in followers:
                # Skip if follower is the creator or has claimed the reward
                if (follower.id == project.creator.id or 
                    (claimed_users and follower in claimed_users)):
                    continue
                
                follower_name = self._get_user_display_name(follower)
                follower_context = EmailContext(
                    template_type='reward_updated',
                    context={
                        **base_context,
                        'user_name': follower_name,
                        'is_creator': False,
                        'is_follower': True
                    }
                )
                self._send_safe(follower_context, follower.email, follower_name)

    def notify_reward_claimed(self, user: 'User', project: 'Project', reward: 'Reward') -> None:
        """Send notifications when a reward is claimed"""
        user_name = self._get_user_display_name(user)
        creator_name = self._get_user_display_name(project.creator)
        
        # Notification to backer
        backer_context = EmailContext(
            template_type='reward_claimed_backer',
            context={
                'user_name': user_name,
                'project_title': project.title,
                'reward_title': reward.title,
                'estimated_delivery': reward.estimated_delivery_date,
                'shipping_type': reward.shipping_type
            }
        )
        self._send_safe(backer_context, user.email, user_name)

        # Notification to project creator
        creator_context = EmailContext(
            template_type='reward_claimed_creator',
            context={
                'backer_name': user_name,
                'project_title': project.title,
                'reward_title': reward.title
            }
        )
        self._send_safe(creator_context, project.creator.email, creator_name)

# Single instance for import
reward_email_service = RewardEmailService()