# app/services/backer_service.py

from app.models.user import User
from app.models.project import Project
from app.models.donation import Donation
from app import db, cache
from sqlalchemy import func
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from app.services.email_service import send_templated_email
from app.models.enums import DonationStatus, ProjectStatus
from app.schemas.backer_schemas import BackProjectSchema, ProjectUpdateSchema, ProjectMilestoneSchema
from marshmallow import ValidationError
from sqlalchemy.exc import SQLAlchemyError
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class BackerService:
    def _validate_reward(self, project, amount, reward_id, session):
        """
        Validate reward selection for a project backing.
        
        Args:
            project: Project instance
            amount: Donation amount
            reward_id: ID of selected reward
            session: Database session
        
        Returns:
            tuple: (is_valid, result)
                is_valid (bool): Whether the reward selection is valid
                result: Either error message string or Reward instance
        """
        if reward_id:
            reward = session.query(Reward).filter_by(
                id=reward_id, 
                project_id=project.id
            ).first()
            
            if not reward:
                return False, "Selected reward does not exist for this project"
                
            if reward.minimum_amount > amount:
                return False, f"Minimum amount of {reward.minimum_amount} required for this reward"
                
            if reward.quantity_available is not None:
                if reward.quantity_claimed >= reward.quantity_available:
                    return False, "This reward is no longer available"
                    
            return True, reward
        return True, None

    def back_project(self, project_id, user_id, data):
        """
        Handle the process of a user backing a project.
        """
        try:
            schema = BackProjectSchema()
            validated_data = schema.load(data)
            
            with Session(db.engine) as session:
                with session.begin():
                    # 1. First check if project exists and is active
                    project = self._get_project(project_id, session)
                    if not project:
                        logger.error(f"Project {project_id} not found")
                        return {'error': 'Project not found', 'status_code': 404}

                    if project.status != ProjectStatus.ACTIVE:
                        logger.error(f"Project {project_id} is not active. Current status: {project.status}")
                        return {'error': 'Project is not currently accepting donations', 'status_code': 400}

                    # 2. Check if user exists
                    user = self._get_user(user_id, session)
                    if not user:
                        logger.error(f"User {user_id} not found")
                        return {'error': 'User not found', 'status_code': 404}

                    # 3. Validate reward if provided
                    reward_id = validated_data.get('reward_id')
                    if reward_id:
                        is_valid, result = self._validate_reward(
                            project, 
                            validated_data['amount'], 
                            reward_id, 
                            session
                        )
                        
                        if not is_valid:
                            logger.error(f"Reward validation failed: {result}")
                            return {'error': result, 'status_code': 400}
                            
                        # If valid and reward exists, increment claimed quantity
                        reward = result if isinstance(result, Reward) else None
                        if reward:
                            if reward.quantity_available is not None:
                                if reward.quantity_claimed >= reward.quantity_available:
                                    return {'error': 'This reward is no longer available', 'status_code': 400}
                            reward.quantity_claimed += 1

                    # 4. Create donation and update project
                    try:
                        donation = self._create_donation(user, project, validated_data, session)
                        self._update_project_status(project, validated_data['amount'])
                        
                        # 5. Add user to project backers if not already there
                        if user not in project.backers:
                            project.backers.append(user)
                        
                        session.commit()
                    except SQLAlchemyError as e:
                        logger.error(f"Database error while creating donation: {str(e)}")
                        session.rollback()
                        return {'error': 'Failed to process donation', 'status_code': 500}

                    # 6. Post-donation actions
                    try:
                        self._send_confirmation_email(user, project, donation)
                        self.invalidate_backer_stats_cache(project_id)
                    except Exception as e:
                        logger.error(f"Error in post-donation processing: {str(e)}")
                        # Don't return error here as donation was successful
                    
                    return self._prepare_backing_result(user, project, donation)
        
        except ValidationError as e:
            logger.warning(f"Validation error in back_project: {e.messages}")
            return {'error': e.messages, 'status_code': 400}
        except Exception as e:
            logger.error(f"Unexpected error in back_project: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}

    def get_project_backers(self, project_id, page, per_page):
        """
        Retrieve a paginated list of backers for a specific project.
        """
        try:
            project = self._get_project(project_id)
            if not project:
                return {'error': 'Project not found', 'status_code': 404}

            backers_paginated = project.backers.paginate(page=page, per_page=per_page, error_out=False)

            backers = [{
                'user_id': backer.id,
                'username': backer.username,
                'total_amount': db.session.query(func.sum(Donation.amount)).filter(Donation.user_id == backer.id, Donation.project_id == project_id).scalar() or 0,
                'first_backed_at': db.session.query(func.min(Donation.created_at)).filter(Donation.user_id == backer.id, Donation.project_id == project_id).scalar()
            } for backer in backers_paginated.items]

            meta = {
                'page': backers_paginated.page,
                'per_page': backers_paginated.per_page,
                'total': backers_paginated.total,
                'pages': backers_paginated.pages
            }

            return {'backers': backers, 'meta': meta}
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_project_backers: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}

    def get_user_backed_projects(self, user_id, page, per_page):
        """
        Retrieve a paginated list of projects backed by a specific user.
        """
        try:
            user = self._get_user(user_id)
            if not user:
                return {'error': 'User not found', 'status_code': 404}

            backed_projects_paginated = user.backed_projects.paginate(page=page, per_page=per_page, error_out=False)

            projects = [{
                'project_id': project.id,
                'title': project.title,
                'total_amount': db.session.query(func.sum(Donation.amount)).filter(Donation.user_id == user.id, Donation.project_id == project.id).scalar() or 0,
                'first_backed_at': db.session.query(func.min(Donation.created_at)).filter(Donation.user_id == user.id, Donation.project_id == project.id).scalar()
            } for project in backed_projects_paginated.items]

            meta = {
                'page': backed_projects_paginated.page,
                'per_page': backed_projects_paginated.per_page,
                'total': backed_projects_paginated.total,
                'pages': backed_projects_paginated.pages
            }

            return {'projects': projects, 'meta': meta}
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_user_backed_projects: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}

    def get_backer_details(self, project_id, user_id):
        """
        Retrieve detailed information about a user's backing of a specific project.
        """
        try:
            project = self._get_project(project_id)
            user = self._get_user(user_id)
            
            if not project or not user:
                return {'error': 'Project or User not found', 'status_code': 404}
            
            if user not in project.backers:
                return {'error': 'User is not a backer of this project', 'status_code': 404}
            
            donations = Donation.query.filter_by(project_id=project_id, user_id=user_id).all()
            
            return {
                'user_id': user.id,
                'username': user.username,
                'project_id': project.id,
                'project_title': project.title,
                'project_status': project.status.value,
                'total_amount': sum(d.amount for d in donations),
                'donations': [{
                    'amount': d.amount,
                    'created_at': d.created_at,
                    'status': d.status.value,
                    'reward_id': d.reward_id
                } for d in donations]
            }
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_backer_details: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}

    @cache.memoize(timeout=300)  # Cache for 5 minutes
    def get_backer_stats(self, project_id):
        """
        Get statistics about backers for a specific project.

        This method is cached to improve performance for frequently accessed data.
        """
        try:
            project = self._get_project(project_id)
            if not project:
                return {'error': 'Project not found', 'status_code': 404}

            stats = db.session.query(
                func.count(Donation.id).label('total_donations'),
                func.sum(Donation.amount).label('total_amount'),
                func.avg(Donation.amount).label('average_amount')
            ).filter(Donation.project_id == project_id).first()

            return {
                'project_id': project_id,
                'project_status': project.status.value,
                'total_backers': project.backers.count(),
                'total_donations': stats.total_donations or 0,
                'total_amount': float(stats.total_amount) if stats.total_amount else 0,
                'average_amount': float(stats.average_amount) if stats.average_amount else 0
            }
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_backer_stats: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}
    
    def invalidate_backer_stats_cache(self, project_id):
        """
        Invalidate the cache for backer stats when there's a new donation.
        """
        cache.delete_memoized(self.get_backer_stats, self, project_id)

    def send_project_update_email(self, project_id, update_title, update_content):
        """
        Send a project update email to all backers of a specific project.
        """
        try:
            project = self._get_project(project_id)
            if not project:
                return {'error': 'Project not found', 'status_code': 404}

            for backer in project.backers:
                send_templated_email(
                    to_email=backer.email,
                    email_type='project_update',
                    user_name=backer.username,
                    project_title=project.title,
                    update_title=update_title,
                    update_content=update_content
                )
            return {'message': f'Update email sent to {project.backers.count()} backers'}
        except SQLAlchemyError as e:
            logger.error(f"Database error in send_project_update_email: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}

    def send_project_milestone_email(self, project_id, milestone_title, milestone_description):
        """
        Send a project milestone email to all backers of a specific project.
        """
        try:
            project = self._get_project(project_id)
            if not project:
                return {'error': 'Project not found', 'status_code': 404}

            for backer in project.backers:
                send_templated_email(
                    to_email=backer.email,
                    email_type='project_milestone',
                    user_name=backer.username,
                    project_title=project.title,
                    milestone_title=milestone_title,
                    milestone_description=milestone_description
                )
            return {'message': f'Milestone email sent to {project.backers.count()} backers'}
        except SQLAlchemyError as e:
            logger.error(f"Database error in send_project_milestone_email: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}

    @staticmethod
    def _get_project(project_id, session):
        return session.query(Project).get(project_id)

    @staticmethod
    def _get_user(user_id, session):
        return session.query(User).get(user_id)

    @staticmethod
    def _create_donation(user, project, validated_data, session):
        donation = Donation(
            amount=validated_data['amount'],
            created_at=datetime.utcnow(),
            user_id=user.id,
            project_id=project.id,
            status=DonationStatus.PENDING,
            reward_id=validated_data.get('reward_id', None)
        )
        session.add(donation)
        return donation

    @staticmethod
    def _update_project_status(project, amount):
        project.current_amount_decimal += Decimal(str(amount))
        if project.current_amount_decimal >= project.goal_amount_decimal:
            project.status = ProjectStatus.FUNDED

    @staticmethod
    def _send_confirmation_email(user, project, donation):
        send_templated_email(
            to_email=user.email,
            email_type='project_backed',
            user_name=user.username,
            project_title=project.title,
            amount=donation.amount,
            reward_title=donation.reward.title if donation.reward else None
        )

    @staticmethod
    def _prepare_backing_result(user, project, donation):
        return {
            'user_id': user.id,
            'project_id': project.id,
            'amount': donation.amount,
            'created_at': donation.created_at,
            'donation_status': donation.status.value,
            'project_status': project.status.value,
            'reward_id': donation.reward_id
        }