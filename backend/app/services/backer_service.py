# app/services/backer_service.py

from app.models.user import User
from app.models.project import Project
from app.models.donation import Donation
from app import db
from sqlalchemy import func
from datetime import datetime
from app.services.email_service import send_templated_email
from app.models.enums import DonationStatus, ProjectStatus

class BackerService:
    def back_project(self, project_id, data):
        try:
            with db.session.begin_nested():
            user_id = data.get('user_id')
            amount = data.get('amount')
            reward_id = data.get('reward_id')

            if not user_id or not amount:
                return {'error': 'User ID and amount are required', 'status_code': 400}

            project = Project.query.get(project_id)
            if not project:
                return {'error': 'Project not found', 'status_code': 404}

            if project.status != ProjectStatus.ACTIVE:
                return {'error': 'Project is not currently accepting donations', 'status_code': 400}

            user = User.query.get(user_id)
            if not user:
                return {'error': 'User not found', 'status_code': 404}

            donation = Donation(
                amount=amount,
                created_at=datetime.utcnow(),
                user_id=user.id,
                project_id=project.id,
                status=DonationStatus.PENDING,
                reward_id=reward_id
            )
            db.session.add(donation)
            
            # Update project's current amount
            project.current_amount += amount
            
            # Check if project is now fully funded
            if project.current_amount >= project.goal_amount:
                project.status = ProjectStatus.FUNDED
        
            # Add user to project backers if not already there
            if user not in project.backers:
                project.backers.append(user)
            
            db.session.commit()

            # Send confirmation email to the backer
            send_templated_email(
                to_email=user.email,
                email_type='project_backed',
                user_name=user.username,
                project_title=project.title,
                amount=amount,
                reward_title=reward.title if reward else None
            )

            return {
                'user_id': user.id,
                'project_id': project.id,
                'amount': amount,
                'created_at': donation.created_at,
                'donation_status': donation.status,
                'project_status': project.status.value,
                'reward_id': reward_id
            }

    def get_project_backers(self, project_id, page, per_page):
        project = Project.query.get(project_id)
        if not project:
            return {'error': 'Project not found', 'status_code': 404}

        backers_paginated = project.backers.paginate(page=page, per_page=per_page, error_out=False)

        backers = [{
            'user_id': backer.id,
            'username': backer.username,
            'total_amount': sum(d.amount for d in backer.donations if d.project_id == project_id),
            'first_backed_at': min(d.created_at for d in backer.donations if d.project_id == project_id)
        } for backer in backers_paginated.items]

        meta = {
            'page': backers_paginated.page,
            'per_page': backers_paginated.per_page,
            'total': backers_paginated.total,
            'pages': backers_paginated.pages
        }

        return {'backers': backers, 'meta': meta}

    def get_user_backed_projects(self, user_id, page, per_page):
        user = User.query.get(user_id)
        if not user:
            return {'error': 'User not found', 'status_code': 404}

        backed_projects_paginated = user.backed_projects.paginate(page=page, per_page=per_page, error_out=False)

        projects = [{
            'project_id': project.id,
            'title': project.title,
            'total_amount': sum(d.amount for d in user.donations if d.project_id == project.id),
            'first_backed_at': min(d.created_at for d in user.donations if d.project_id == project.id)
        } for project in backed_projects_paginated.items]

        meta = {
            'page': backed_projects_paginated.page,
            'per_page': backed_projects_paginated.per_page,
            'total': backed_projects_paginated.total,
            'pages': backed_projects_paginated.pages
        }

        return {'projects': projects, 'meta': meta}

    def get_backer_details(self, project_id, user_id):
        project = Project.query.get(project_id)
        user = User.query.get(user_id)
        
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
            'project_status': project.status.value,  # Include project status
            'total_amount': sum(d.amount for d in donations),
            'donations': [{
                'amount': d.amount,
                'created_at': d.created_at,
                'status': d.status.value,  # Use .value to get the string representation
                'reward_id': d.reward_id
            } for d in donations]
        }

    def get_backer_stats(self, project_id):
        project = Project.query.get(project_id)
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
            'total_backers': len(project.backers),
            'total_donations': stats.total_donations,
            'total_amount': float(stats.total_amount) if stats.total_amount else 0,
            'average_amount': float(stats.average_amount) if stats.average_amount else 0
        }

    def send_project_update_email(self, project_id, update_title, update_content):
        project = Project.query.get(project_id)
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

    def send_project_milestone_email(self, project_id, milestone_title, milestone_description):
        project = Project.query.get(project_id)
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