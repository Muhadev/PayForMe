# app/services/backer_service.py

from app.models.user import User
from app.models.project import Project
# import asyncio
from threading import Thread
from app.models.donation import Donation
from app.models import Reward
from app import db, cache
from sqlalchemy import func,  distinct
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from app.services.email_service import send_templated_email
from app.models.enums import DonationStatus, ProjectStatus
from app.services.donation_service import DonationService
from decimal import Decimal, InvalidOperation
from app.schemas.backer_schemas import BackProjectSchema, ProjectUpdateSchema, ProjectMilestoneSchema
from marshmallow import ValidationError
from sqlalchemy.exc import SQLAlchemyError
from flask import current_app
# from flask_sqlalchemy import Pagination
import logging

logger = logging.getLogger(__name__)

class BackerService:
    def __init__(self):
        self.donation_service = DonationService()
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
        Create a donation for a project.
        
        Args:
            project_id: ID of the project
            user_id: ID of the user making the donation
            data: Dictionary containing donation details
            
        Returns:
            dict: Result containing donation details or error information
        """
        try:
            logger.info(f"Backing project: project_id={project_id}, user_id={user_id}, data={data}")
            
            try:
                amount = Decimal(str(data['amount'])).quantize(Decimal('0.01'))
                logger.info(f"Converted amount: {amount}, type: {type(amount)}")
            except (InvalidOperation, TypeError) as e:
                logger.error(f"Amount conversion error: {str(e)}")
                return {'error': 'Invalid amount format', 'status_code': 400}

            with Session(db.engine) as session:
                try:
                    # Start transaction
                    project = self._get_project(project_id, session)
                    if not project:
                        return {'error': 'Project not found', 'status_code': 404}

                    logger.info(f"Found project with current amount: {project.current_amount}")

                    if project.status != ProjectStatus.ACTIVE:
                        return {'error': 'Project is not currently accepting donations', 'status_code': 400}

                    user = self._get_user(user_id, session)
                    if not user:
                        return {'error': 'User not found', 'status_code': 404}

                    # Validate reward if provided
                    reward_id = data.get('reward_id')
                    if reward_id:
                        is_valid, result = self._validate_reward(project, amount, reward_id, session)
                        if not is_valid:
                            return {'error': result, 'status_code': 400}

                    # Create donation
                    donation = Donation(
                        user_id=user_id,
                        project_id=project_id,
                        amount=amount,
                        reward_id=reward_id,
                        currency=data.get('currency', 'USD'),
                        status=DonationStatus.PENDING,
                        created_at=datetime.utcnow()
                    )
                    session.add(donation)

                    # Update project amounts
                    if project.current_amount is None:
                        project.current_amount = Decimal('0')
                    project.current_amount += amount
                    
                    logger.info(f"After update - New current amount: {project.current_amount}")

                    if project.current_amount >= project.goal_amount:
                        project.status = ProjectStatus.FUNDED

                    if user not in project.backers:
                        project.backers.append(user)
                        project.backers_count = project.backers_count + 1  # Increment the counter

                    # Commit the transaction
                    session.commit()

                    # Prepare response after successful commit
                    result = {
                        'donation': {
                            'id': donation.id,
                            'amount': str(donation.amount),
                            'currency': donation.currency,
                            'status': donation.status.value
                        },
                        'user_id': user.id,
                        'project_id': project.id,
                        'created_at': donation.created_at.isoformat() if donation.created_at else None,
                        'donation_status': donation.status.value,
                        'project_status': project.status.value,
                        'reward_id': donation.reward_id
                    }

                    # Handle email sending in background
                    # app = current_app._get_current_object()
                    # Thread(target=self._send_confirmation_email_with_context,
                    #     args=(app, user.email, user.username, project.title, donation)).start()
                    
                    self.invalidate_backer_stats_cache(project_id)
                    return result

                except SQLAlchemyError as e:
                    session.rollback()
                    logger.error(f"Database error in back_project: {str(e)}")
                    return {'error': 'Database error occurred', 'status_code': 500}

        except Exception as e:
            logger.error(f"Unexpected error in back_project: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}

    # def _send_success_email(self, user_email, user_username, project_title, donation):
    #     """
    #     Send success email after payment is completed.
    #     """
    #     try:
    #         with current_app.app_context():
    #             email_kwargs = {
    #                 'donor_name': user_username,
    #                 'project_title': project_title,
    #                 'amount': float(donation.amount),
    #                 'donation_id': donation.id
    #             }

    #             send_templated_email(
    #                 to_email=user_email,
    #                 email_type='donation_success',
    #                 **email_kwargs
    #             )
    #             logger.info(f"Donation success email sent to {user_email}")
    #     except Exception as e:
    #         logger.error(f"Failed to send success email: {str(e)}")

    def _send_confirmation_email_with_context(self, app, user_email, user_username, project_title, donation):
        """
        Wrapper to send confirmation email, ensuring application context in the thread.
        """
        try:
            with app.app_context():
                self._send_confirmation_email(user_email, user_username, project_title, donation)
        except Exception as e:
            logger.error(f"Failed to send confirmation email in thread: {str(e)}")

    def _send_confirmation_email(self, user_email, user_username, project_title, donation):
        """
        Send confirmation email within application context.
        """
        try:
            with current_app.app_context():  # Use current_app instead of importing app
                email_kwargs = {
                    'user_name': user_username,
                    'project_title': project_title,
                    'amount': float(donation.amount),  # Ensure it's a float
                }

                # Add reward title if a reward exists
                if donation.reward:
                    email_kwargs['reward_title'] = donation.reward.title

                send_templated_email(
                    to_email=user_email,
                    email_type='project_backed',
                    **email_kwargs
                )
        except Exception as e:
            logger.error(f"Failed to send confirmation email: {str(e)}")

    @staticmethod
    def _prepare_backing_result(user, project, donation):
        return {
            'donation': {
                'id': donation.id,
                'amount': str(donation.amount),  # Convert Decimal to string for JSON
                'currency': donation.currency,
                'status': donation.status.value
            },
            'user_id': user.id,
            'project_id': project.id,
            'created_at': donation.created_at.isoformat(),
            'donation_status': donation.status.value,
            'project_status': project.status.value,
            'reward_id': donation.reward_id
        }
    @staticmethod
    def _get_user(user_id, session):
        user = session.query(User).get(user_id)
        if user is None:
            logger.warning(f"User with id {user_id} not found in the database")
        return user

    @staticmethod
    def _get_project(project_id, session):
        project = session.query(Project).get(project_id)
        if project is None:
            logger.warning(f"Project with id {project_id} not found in the database")
        return project

    def get_project_backers(self, project_id, page, per_page):
        """
        Get paginated list of project backers with their donation details.
        
        Args:
            project_id: ID of the project
            page: Current page number (1-based)
            per_page: Number of items per page
        """
        try:
            with Session(db.engine) as session:
                project = self._get_project(project_id, session)
                if not project:
                    return {'error': 'Project not found', 'status_code': 404}

                # Calculate offset for pagination
                offset = (page - 1) * per_page

                # Get total count of backers
                total = session.query(User).join(User.backed_projects)\
                    .filter(Project.id == project_id).count()

                # Get paginated backers
                backers_query = session.query(User).join(User.backed_projects)\
                    .filter(Project.id == project_id)\
                    .order_by(User.id)\
                    .offset(offset)\
                    .limit(per_page)

                backers = []
                for backer in backers_query:
                    # Get total amount donated by this backer
                    total_amount = session.query(func.sum(Donation.amount))\
                        .filter(
                            Donation.user_id == backer.id,
                            Donation.project_id == project_id
                        ).scalar() or 0

                    # Get first donation date
                    first_backed_at = session.query(func.min(Donation.created_at))\
                        .filter(
                            Donation.user_id == backer.id,
                            Donation.project_id == project_id
                        ).scalar()

                    backers.append({
                        'user_id': backer.id,
                        'username': backer.username,
                        'total_amount': float(total_amount),
                        'first_backed_at': first_backed_at
                    })

                # Calculate total pages
                total_pages = (total + per_page - 1) // per_page

                meta = {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': total_pages
                }

                return {'backers': backers, 'meta': meta}
                
        except Exception as e:
            logger.error(f"Error in get_project_backers: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}

    def get_user_backed_projects(self, user_id, page, per_page, status=None):
        """
        Retrieve a paginated list of projects backed by a specific user.
        """
        try:
            with Session(db.engine) as session:
                user = self._get_user(user_id, session)
                if not user:
                    logger.warning(f"User with id {user_id} not found")
                    return {'error': f'User with id {user_id} not found', 'status_code': 404}
                    
                # Query for backed projects
                backed_projects_query = session.query(Project).join(Project.backers).filter(User.id == user_id)
                
                # Apply status filter if provided
                if status:
                    backed_projects_query = backed_projects_query.filter(Project.status == status.upper())
                    
                # Count total items
                total = backed_projects_query.count()
                    
                # Apply pagination
                offset = (page - 1) * per_page
                backed_projects = backed_projects_query.offset(offset).limit(per_page).all()
                    
                projects = []
                for project in backed_projects:
                    total_amount = session.query(func.sum(Donation.amount)).filter(
                        Donation.user_id == user.id,
                        Donation.project_id == project.id
                    ).scalar() or 0
                        
                    first_backed_at = session.query(func.min(Donation.created_at)).filter(
                        Donation.user_id == user.id,
                        Donation.project_id == project.id
                    ).scalar()

                    total_pledged = session.query(func.sum(Donation.amount)).filter(
                        Donation.project_id == project.id
                    ).scalar() or 0

                        
                    projects.append({
                        'project_id': project.id,
                        'id': project.id,
                        'title': project.title,
                        'description': project.description,
                        'total_amount': float(total_amount),
                        'first_backed_at': first_backed_at,
                        'status': project.status.value if project.status else None,
                        'image_url': project.image_url,
                        'start_date': project.start_date,
                        'end_date': project.end_date,
                        'goal_amount': float(project.goal_amount) if project.goal_amount else 0,
                        'category_id': project.category_id,
                        'total_pledged': float(total_pledged),
                        'backers_count': project.backers_count
                    })
                        
                # Calculate pagination metadata
                total_pages = (total + per_page - 1) // per_page
                meta = {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': total_pages
                }
                    
                logger.info(f"Successfully retrieved {len(projects)} backed projects for user {user_id}")
                return {'projects': projects, 'meta': meta}
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_user_backed_projects for user {user_id}: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}

    def get_backer_details(self, project_id, user_id):
        """
        Retrieve detailed information about a user's backing of a specific project.
        """
        try:
            with Session(db.engine) as session:
                project = self._get_project(project_id, session)
                user = self._get_user(user_id, session)
                
                if not project or not user:
                    logger.warning(f"Project {project_id} or User {user_id} not found")
                    return {'error': 'Project or User not found', 'status_code': 404}
                
                if user not in project.backers:
                    logger.warning(f"User {user_id} is not a backer of project {project_id}")
                    return {'error': 'User is not a backer of this project', 'status_code': 404}
                
                donations = session.query(Donation).filter_by(project_id=project_id, user_id=user_id).all()
                
                result = {
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
                
                logger.info(f"Successfully retrieved backer details for user {user_id} on project {project_id}")
                return result
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
            with Session(db.engine) as session:
                project = self._get_project(project_id, session)
                if not project:
                    return {'error': 'Project not found', 'status_code': 404}

                stats = session.query(
                    func.count(Donation.id).label('total_donations'),
                    func.sum(Donation.amount).label('total_amount'),
                    func.avg(Donation.amount).label('average_amount')
                ).filter(Donation.project_id == project_id).first()

                return {
                    'project_id': project_id,
                    'project_status': project.status.value,
                    'total_backers': len(project.backers),
                    'total_donations': stats.total_donations or 0,
                    'total_amount': float(stats.total_amount) if stats.total_amount else 0,
                    'average_amount': float(stats.average_amount) if stats.average_amount else 0
                }
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_backer_stats: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}
    
    def get_public_backer_stats(self, project_id):
        """
        Get public statistics about backers for a specific project.
        Returns only non-sensitive aggregate data that can be viewed publicly.
        """
        try:
            with Session(db.engine) as session:
                project = self._get_project(project_id, session)
                if not project:
                    return {'error': 'Project not found', 'status_code': 404}

                # Query for basic statistics - non-sensitive data only
                stats = session.query(
                    func.count(distinct(Donation.user_id)).label('total_backers'),
                    func.sum(Donation.amount).label('total_amount')
                ).filter(Donation.project_id == project_id).first()

                return {
                    'project_id': project_id,
                    'project_title': project.title,
                    'total_backers': stats.total_backers or 0,
                    'total_amount': float(stats.total_amount) if stats.total_amount else 0,
                    # 'funding_percentage': self._calculate_funding_percentage(project, stats.total_amount)
                }
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_public_backer_stats: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}

    def _calculate_funding_percentage(self, project, total_amount):
        """
        Helper method to calculate funding percentage based on goal.
        """
        if not project.funding_goal or not total_amount:
            return 0
        return min(100, round((float(total_amount) / float(project.funding_goal)) * 100, 2))

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
            with Session(db.engine) as session:
                project = self._get_project(project_id, session)
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
                return {'message': f'Update email sent to {len(project.backers)} backers'}
        except SQLAlchemyError as e:
            logger.error(f"Database error in send_project_update_email: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}

    def send_project_milestone_email(self, project_id, milestone_title, milestone_description):
        """
        Send a project milestone email to all backers of a specific project.
        """
        try:
            with Session(db.engine) as session:
                project = self._get_project(project_id, session)
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
                return {'message': f'Milestone email sent to {len(project.backers)} backers'}
        except SQLAlchemyError as e:
            logger.error(f"Database error in send_project_milestone_email: {str(e)}")
            return {'error': 'An unexpected error occurred', 'status_code': 500}

    @staticmethod
    def _update_project_status(project, amount):
        """
        Update project status based on new donation amount
        
        Args:
            project: Project instance
            amount: Decimal amount to add
        """
        try:
            logger.info(f"Before update - Current amount: {project.current_amount}, Goal amount: {project.goal_amount}")
            
            if project.current_amount is None:
                project.current_amount = 0
                
            # Direct addition without conversion
            project.current_amount += amount
            
            logger.info(f"After update - New current amount: {project.current_amount}")
            
            # Check if project is funded
            if project.current_amount >= project.goal_amount:
                project.status = ProjectStatus.FUNDED
                
        except Exception as e:
            logger.error(f"Error in _update_project_status: {e}")
            raise