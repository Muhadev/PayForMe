# app/services/backer_service.py

from app.models.user import User
from app.models.project import Project
from app.models.donation import Donation
from app import db
from sqlalchemy import func
from datetime import datetime
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
    class BackerService:
    def back_project(self, project_id, user_id, data):
        """
        Handle the process of a user backing a project.

        This method creates a new donation, updates the project's current amount,
        and sends a confirmation email to the backer.
        """
        try:
            schema = BackProjectSchema()
            validated_data = schema.load(data)
            
            with Session(db.engine) as session:
                with session.begin():
                    project = self._get_project(project_id, session)
                    if not project:
                        return {'error': 'Project not found', 'status_code': 404}

                    if project.status != ProjectStatus.ACTIVE:
                        return {'error': 'Project is not currently accepting donations', 'status_code': 400}

                    user = self._get_user(user_id, session)
                    if not user:
                        return {'error': 'User not found', 'status_code': 404}

                    donation = self._create_donation(user, project, validated_data, session)
                    self._update_project_status(project, validated_data['amount'])
                    
                    if user not in project.backers:
                        project.backers.append(user)
                    
                    session.commit()
            
            self._send_confirmation_email(user, project, donation)
            self.invalidate_backer_stats_cache(project_id)
            
            return self._prepare_backing_result(user, project, donation)
    
        except ValidationError as e:
            current_app.logger.warning(f"Validation error in back_project: {e.messages}")
            return {'error': e.messages, 'status_code': 400}
        except SQLAlchemyError as e:
            current_app.logger.error(f"Database error in back_project: {str(e)}")
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
            reward_id=validated_data.get('reward_id')
        )
        session.add(donation)
        return donation

    @staticmethod
    def _update_project_status(project, amount):
        project.current_amount += amount
        if project.current_amount >= project.goal_amount:
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