from app.models.reward import Reward
from app.models.project import Project
from typing import Optional, Dict, Any, List
from datetime import date, datetime
from app.models.user import User
from app import db
from sqlalchemy.exc import SQLAlchemyError
from app.schemas.reward_schemas import RewardSchema, RewardUpdateSchema
from app.services.email_service import send_templated_email
from app.services.reward_email_service import reward_email_service
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class ServiceResponse:
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    status_code: int = 200

class RewardService:
    def _validate_reward_constraints(self, reward: Reward) -> bool:
        """
        Validate business rules for rewards
        
        Args:
            reward: Reward instance to validate
            
        Returns:
            bool: True if validation passes, False otherwise
        """
        if reward.minimum_amount and reward.minimum_amount < 0:
            return False
        if reward.quantity_available is not None and reward.quantity_available < 1:
            return False
        return True
    
    def create_reward(self, project_id, data):
        try:
            project = Project.query.get(project_id)
            if not project:
                return ServiceResponse(
                    error='Project not found',
                    status_code=404
                )

            schema = RewardSchema()
            reward_data = schema.load(data)

            # Handle date conversion
            if delivery_date := reward_data.get('estimated_delivery_date'):
                reward_data['estimated_delivery_date'] = datetime.combine(
                    delivery_date,
                    datetime.min.time()
                )
            with db.session.begin_nested():  # Create savepoint
                reward = Reward(project_id=project_id, **reward_data)
                db.session.add(reward)
                db.session.flush()  # Flush to get the ID without committing

                # Additional validations can go here
                if not self._validate_reward_constraints(reward):
                    raise ValueError("Reward constraints validation failed")

            db.session.commit()

            # Send email notification using the email service
            reward_email_service.notify_reward_creation(project, reward)
            
            return ServiceResponse(
                data=schema.dump(reward)
            )

        except ValueError as e:
            db.session.rollback()
            logger.warning(f"Validation error in create_reward: {str(e)}")
            return ServiceResponse(
                error=str(e),
                status_code=400
            )
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error in create_reward: {str(e)}")
            return ServiceResponse(
                error='An unexpected error occurred',
                status_code=500
            )

    def _standardize_date(self, date_value):
        """Standardize date values to datetime objects"""
        if isinstance(date_value, date):
            return datetime.combine(date_value, datetime.min.time())
        return date_value

    def update_reward(self, project_id: int, reward_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update a reward and notify backers of changes
        
        Args:
            project_id: ID of the project
            reward_id: ID of the reward to update
            data: Dictionary containing updated reward data
            
        Returns:
            Dictionary containing updated reward data or error message
        """
        try:
            # Fetch reward with project relationship
            reward = Reward.query.filter_by(
                project_id=project_id, 
                id=reward_id
            ).first()
            
            if not reward:
                return {'error': 'Reward not found', 'status_code': 404}

            # Fetch project for email notification
            project = Project.query.get(project_id)
            if not project:
                return {'error': 'Project not found', 'status_code': 404}

            schema = RewardUpdateSchema()
            update_data = schema.load(data)
            
            # Standardize date handling
            if 'estimated_delivery_date' in update_data:
                if isinstance(update_data['estimated_delivery_date'], str):
                    update_data['estimated_delivery_date'] = datetime.strptime(
                        update_data['estimated_delivery_date'], 
                        '%Y-%m-%d'
                    )
                update_data['estimated_delivery_date'] = self._standardize_date(
                    update_data['estimated_delivery_date']
                )
            
            # Track changes for email notification
            changes = []
            for key, new_value in update_data.items():
                old_value = getattr(reward, key)

                if key == 'estimated_delivery_date':
                    old_value = self._standardize_date(old_value)
                    new_value = self._standardize_date(new_value)

                if old_value != new_value:
                    changes.append({
                        'field': key,
                        'old': old_value,
                        'new': new_value
                    })
                    setattr(reward, key, new_value)
            
            try:
                db.session.commit()
                
                # Log the changes
                logger.info(f"Updated reward {reward_id} with changes: {changes}")
                
                # Send email notification if there are changes
                if changes:
                    reward_email_service.notify_reward_update(project, reward, changes)
                    logger.info(f"Triggered update notification for reward {reward_id}")
                
                return schema.dump(reward)
                
            except SQLAlchemyError as e:
                db.session.rollback()
                logger.error(f"Database error in update_reward: {str(e)}")
                return {'error': 'An unexpected error occurred', 'status_code': 500}
                
        except Exception as e:
            logger.error(f"Error in update_reward: {str(e)}")
            return {'error': str(e), 'status_code': 500}

    def claim_reward(self, project_id, reward_id, user_id):
        try:
            with db.session.begin():
                reward = db.session.execute(
                    select(Reward)
                    .where(and_(Reward.project_id == project_id, Reward.id == reward_id))
                    .with_for_update()
                ).scalar_one()

                if not reward:
                    return ServiceResponse(error='Reward not found', status_code=404)

                user = User.query.get(user_id)
                if not user:
                    return {'error': 'User not found', 'status_code': 404}

                if reward.quantity_available is not None and reward.quantity_claimed >= reward.quantity_available:
                    return ServiceResponse(
                        error='Reward is no longer available',
                        status_code=400
                    )

                reward.quantity_claimed += 1
                user.claimed_rewards.append(reward)
                db.session.commit()

                # Send email notifications
                project = Project.query.get(project_id)
                reward_email_service.notify_reward_claimed(user, project, reward)

                schema = RewardSchema()
                return schema.dump(reward)

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error in claim_reward: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}

    def get_project_rewards(self, project_id, page, per_page):
        rewards = Reward.query.filter_by(project_id=project_id).paginate(page, per_page, error_out=False)
        schema = RewardSchema(many=True)
        return schema.dump(rewards.items)  # Paginated result


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