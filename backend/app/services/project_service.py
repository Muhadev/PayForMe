# app/services/project_service.py

from typing import List, Dict, Any, Optional
from datetime import datetime
from app.models.project import Project
from app.models.enums import ProjectStatus
from app import db
from sqlalchemy.exc import SQLAlchemyError
from app.utils.project_utils import validate_project_data
from app.utils.exceptions import ValidationError, ProjectNotFoundError
from app.services.notification_service import NotificationService
import logging
from sqlalchemy import desc


logger = logging.getLogger(__name__)

def get_user_drafts(user_id: int) -> List[Project]:
    """Retrieve all draft projects for a user."""
    try:
        drafts = Project.query.filter_by(creator_id=user_id, status=ProjectStatus.DRAFT.value).all()
        return drafts
    except SQLAlchemyError as e:
        logger.error(f"Error retrieving draft projects: {e}")
        raise Exception(f"Error retrieving draft projects: {e}")

def create_project(data: Dict[str, Any]) -> Project:
    try:

        # Log the entire data payload to check the received data
        logger.info(f"Received data: {data}")

        # Determine if this is a draft based on status
        is_draft = data.get('status') == ProjectStatus.DRAFT

        # Convert status to enum if it's a string
        status = data.get('status', ProjectStatus.DRAFT if is_draft else ProjectStatus.PENDING)

        logger.info(f"Status before creating project: {status}")  # Add this log

        # Convert featured to boolean if it's a string
        featured = data.get('featured', False)
        if isinstance(featured, str):
            featured = featured.lower() == 'true'
        # Set default values for optional fields when creating draft
        default_date = datetime.now().date()
        project_data = {
            'title': data['title'],
            'description': data.get('description', '') if is_draft else data['description'],
            'goal_amount': data.get('goal_amount', 0) if is_draft else data['goal_amount'],
            'start_date': datetime.strptime(data.get('start_date', default_date.strftime('%Y-%m-%d')), '%Y-%m-%d').date(),
            'end_date': datetime.strptime(data.get('end_date', default_date.strftime('%Y-%m-%d')), '%Y-%m-%d').date(),
            'status': status,
            'featured': featured,
            'risk_and_challenges': data.get('risk_and_challenges', ''),
            'video_url': data.get('video_url', ''),
            'image_url': data.get('image_url', ''),
            'creator_id': data['creator_id'],
            'category_id': data.get('category_id', 1) if is_draft else data['category_id']  # Default to category_id 1 for drafts
        }
        logger.info(f"Draft project category data: category_id={project_data.get('category_id')}")

        # Log the project data before creation
        logger.info(f"Project data before creation: {project_data}")

        new_project = Project(**project_data)

        logger.info(f"Project status before adding to session: {new_project.status}")
        db.session.add(new_project)
        logger.info(f"Project status before commit: {new_project.status}")
        db.session.commit()
        logger.info(f"Project status after commit: {new_project.status}")
        logger.info(f"Created new project: {new_project.id} with status {new_project.status}")

        # Create notification for admins if the project is pending
        if new_project.status == ProjectStatus.PENDING:
            try:
                NotificationService.create_admin_notification(
                    message=f"New project '{new_project.title}' needs review",
                    project_id=new_project.id
                )
            except Exception as e:
                logger.error(f"Failed to create admin notification: {e}")

        return new_project

    except KeyError as e:
        logger.error(f"Missing required field: {e}")
        raise ValidationError(f"Missing required field: {e}")
    except ValidationError as e:
        logger.warning(f"Validation error while creating project: {e}")
        raise
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Error creating project: {e}")
        raise Exception(f"Error creating project: {e}")

def update_project(project_id: int, data: Dict[str, Any]) -> Project:
    try:
        project = get_project_by_id(project_id)

        if project.creator_id != current_user_id:
            raise UnauthorizedError("You do not have permission to update this project")

        validate_project_data(data, is_draft=data.get('status') == ProjectStatus.DRAFT.value)
        
        for key, value in data.items():
            if hasattr(project, key):
                if key in ['start_date', 'end_date']:
                    setattr(project, key, datetime.strptime(value, '%Y-%m-%d').date())
                elif key == 'status':
                    setattr(project, key, ProjectStatus(value))
                else:
                    setattr(project, key, value)
        
        db.session.commit()
        logger.info(f"Updated project: {project_id}")
        return project
    except (ValidationError, ProjectNotFoundError) as e:
        logger.warning(f"Error updating project {project_id}: {e}")
        raise
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Error updating project {project_id}: {e}")
        raise Exception(f"Error updating project: {e}")

def get_project_by_id(project_id: int) -> Project:
    """Retrieve a project by its ID."""
    project = Project.query.filter_by(id=project_id, is_deleted=False).first()
    if project is None:
        logger.warning(f"Project with ID {project_id} not found or has been deleted")
        raise ProjectNotFoundError(f"Project with ID {project_id} not found")
    return project

def delete_project(project_id: int) -> bool:
    """Soft delete a project."""
    try:
        project = get_project_by_id(project_id)

        if project.creator_id != current_user_id:
            raise UnauthorizedError("You do not have permission to delete this project")
        
        project.is_deleted = True
        project.deleted_at = datetime.utcnow()
        db.session.commit()
        logger.info(f"Soft deleted project: {project_id}")
        return True
    except ProjectNotFoundError as e:
        logger.warning(f"Error deleting project {project_id}: {e}")
        raise
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Error deleting project {project_id}: {e}")
        raise Exception(f"Error deleting project: {e}")

def get_all_projects(page: int = 1, per_page: int = 10, sort_by: str = 'created_at', sort_order: str = 'desc', filters: Dict[str, Any] = None) -> Any:
    """Retrieve all non-deleted projects with pagination, sorting, and filtering."""
    query = Project.query.filter_by(is_deleted=False)

    # Apply filters
    if filters:
        for key, value in filters.items():
            if hasattr(Project, key):
                query = query.filter(getattr(Project, key) == value)

    # Apply sorting
    if hasattr(Project, sort_by):
        order = desc(getattr(Project, sort_by)) if sort_order == 'desc' else getattr(Project, sort_by)
        query = query.order_by(order)

    return query.paginate(page=page, per_page=per_page, error_out=False)

def activate_project(project_id: int) -> Project:
    try:
        project = get_project_by_id(project_id)
        if project.status != ProjectStatus.PENDING:
            raise ValidationError("Only pending projects can be activated")
        
        project.status = ProjectStatus.ACTIVE
        db.session.commit()
        logger.info(f"Activated project: {project_id}")
        return project
    except (ValidationError, ProjectNotFoundError) as e:
        logger.warning(f"Error activating project {project_id}: {e}")
        raise
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Error activating project {project_id}: {e}")
        raise Exception(f"Error activating project: {e}")