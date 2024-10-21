from app.models.reward import Reward
from app.models.project import Project
from app.models.user import User
from app import db
from sqlalchemy.exc import SQLAlchemyError
from app.schemas.reward_schemas import RewardSchema, RewardUpdateSchema
from app.services.email_service import send_templated_email
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
import logging

logger = logging.getLogger(__name__)

class RewardService:
    def _send_reward_creation_email(self, project, reward):
        """Send email notification about new reward to project creator"""
        try:
            send_templated_email(
                to_email=project.creator.email,
                email_type='reward_created',
                project_title=project.title,
                reward_title=reward.title,
                reward_description=reward.description,
                minimum_amount=str(reward.minimum_amount)
            )
        except Exception as e:
            logger.error(f"Failed to send reward creation email: {str(e)}")

    def _send_reward_claimed_email(self, user, project, reward):
        """Send email notifications about claimed reward"""
        try:
            # Email to backer
            send_templated_email(
                to_email=user.email,
                email_type='reward_claimed_backer',
                project_title=project.title,
                reward_title=reward.title,
                estimated_delivery=reward.estimated_delivery_date,
                shipping_type=reward.shipping_type
            )
            
            # Email to project creator
            send_templated_email(
                to_email=project.creator.email,
                email_type='reward_claimed_creator',
                backer_name=user.name,
                project_title=project.title,
                reward_title=reward.title
            )
        except Exception as e:
            logger.error(f"Failed to send reward claimed emails: {str(e)}")

    def _send_reward_update_email(self, project, reward, changes):
        """Send email notification about reward updates to all backers"""
        try:
            for user in reward.claimed_by:
                send_templated_email(
                    to_email=user.email,
                    email_type='reward_updated',
                    project_title=project.title,
                    reward_title=reward.title,
                    changes=changes
                )
        except Exception as e:
            logger.error(f"Failed to send reward update emails: {str(e)}")

    def create_reward(self, project_id, data):
        try:
            project = Project.query.get(project_id)
            if not project:
                return {'error': 'Project not found', 'status_code': 404}

            schema = RewardSchema()
            reward_data = schema.load(data)
            reward = Reward(project_id=project_id, **reward_data)
            db.session.add(reward)
            db.session.commit()

            # Send email notification
            self._send_reward_creation_email(project, reward)
            
            return schema.dump(reward)
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error in create_reward: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}

    def update_reward(self, project_id, reward_id, data):
        try:
            reward = Reward.query.filter_by(project_id=project_id, id=reward_id).first()
            if not reward:
                return {'error': 'Reward not found', 'status_code': 404}

            schema = RewardUpdateSchema()
            update_data = schema.load(data)
            
            # Track changes for email notification
            changes = []
            for key, value in update_data.items():
                old_value = getattr(reward, key)
                if old_value != value:
                    changes.append({
                        'field': key,
                        'old': old_value,
                        'new': value
                    })
                setattr(reward, key, value)

            db.session.commit()

            # Send email notification if there are changes
            if changes:
                project = Project.query.get(project_id)
                self._send_reward_update_email(project, reward, changes)

            return schema.dump(reward)
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error in update_reward: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}

    def claim_reward(self, project_id, reward_id, user_id):
        try:
            with db.session.begin():
                reward = db.session.execute(
                    select(Reward)
                    .where(and_(Reward.project_id == project_id, Reward.id == reward_id))
                    .with_for_update()
                ).scalar_one()

                if not reward:
                    return {'error': 'Reward not found', 'status_code': 404}

                user = User.query.get(user_id)
                if not user:
                    return {'error': 'User not found', 'status_code': 404}

                if reward.quantity_available is not None and reward.quantity_claimed >= reward.quantity_available:
                    return {'error': 'Reward is no longer available', 'status_code': 400}

                reward.quantity_claimed += 1
                user.claimed_rewards.append(reward)
                db.session.commit()

                # Send email notifications
                project = Project.query.get(project_id)
                self._send_reward_claimed_email(user, project, reward)

                schema = RewardSchema()
                return schema.dump(reward)

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error in claim_reward: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}

    # Other methods remain unchanged
    def get_project_rewards(self, project_id):
        rewards = Reward.query.filter_by(project_id=project_id).all()
        schema = RewardSchema(many=True)
        return schema.dump(rewards)

    def get_reward(self, project_id, reward_id):
        reward = Reward.query.filter_by(project_id=project_id, id=reward_id).first()
        if reward:
            schema = RewardSchema()
            return schema.dump(reward)
        return None

    def delete_reward(self, project_id, reward_id):
        try:
            reward = Reward.query.filter_by(project_id=project_id, id=reward_id).first()
            if reward:
                db.session.delete(reward)
                db.session.commit()
                return True
            return False
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error in delete_reward: {str(e)}")
            return False