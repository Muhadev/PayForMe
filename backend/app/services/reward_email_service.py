from typing import List, Dict, Any, Optional
from datetime import datetime
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
        if value is None:
            return "Not specified"
        return str(value)

    def format_changes(self, changes: List[Dict[str, Any]]) -> str:
        """Format changes for email notification"""
        formatted_changes = []
        for change in changes:
            old_value = self.format_value(change['old'])
            new_value = self.format_value(change['new'])
            formatted_changes.append(
                f"{change['field']}: {old_value} → {new_value}"
            )
        return "\n".join(formatted_changes)

    def _get_user_display_name(self, user: 'User') -> str:
        """Get the best available display name for a user"""
        if user.full_name:
            return user.full_name
        return user.username

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
        """Send reward update notifications to all relevant users"""
        if not changes:
            self.logger.info("No changes to notify about")
            return

        formatted_changes = self.format_changes(changes)
        
        # Always notify project creator
        creator_name = self._get_user_display_name(project.creator)
        creator_context = EmailContext(
            template_type='reward_updated',
            context={
                'user_name': creator_name,
                'project_title': project.title,
                'reward_title': reward.title,
                'changes': formatted_changes,
                'is_creator': True
            }
        )
        self._send_safe(creator_context, project.creator.email, creator_name)
        
        # Notify claimed users if any
        claimed_users = getattr(reward, 'claimed_by', [])
        if claimed_users:
            for user in claimed_users:
                user_name = self._get_user_display_name(user)
                user_context = EmailContext(
                    template_type='reward_updated',
                    context={
                        'user_name': user_name,
                        'project_title': project.title,
                        'reward_title': reward.title,
                        'changes': formatted_changes,
                        'is_creator': False
                    }
                )
                self._send_safe(user_context, user.email, user_name)
        else:
            self.logger.debug(f"No claimed users found for reward {reward.id}")

        # Optionally notify project followers
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
                        'user_name': follower_name,
                        'project_title': project.title,
                        'reward_title': reward.title,
                        'changes': formatted_changes,
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