from app.models.project import Project
from app import db
from sqlalchemy.exc import SQLAlchemyError

def create_project(data):
    """Create a new project."""
    try:
        new_project = Project(
            title=data.get('title'),
            description=data.get('description'),
            goal_amount=data.get('goal_amount'),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
            creator_id=data.get('creator_id'),
            category_id=data.get('category_id'),
            status='draft'
        )
        db.session.add(new_project)
        db.session.commit()
        return new_project
    except SQLAlchemyError as e:
        db.session.rollback()
        raise Exception(f"Error creating project: {e}")

def get_project_by_id(project_id):
    """Retrieve a project by its ID."""
    project = Project.query.get(project_id)
    if project is None:
        raise Exception(f"Project with ID {project_id} not found")
    return project

def update_project(project_id, data):
    """Update a project's information."""
    try:
        project = get_project_by_id(project_id)
        project.title = data.get('title', project.title)
        project.description = data.get('description', project.description)
        project.goal_amount = data.get('goal_amount', project.goal_amount)
        project.start_date = data.get('start_date', project.start_date)
        project.end_date = data.get('end_date', project.end_date)
        project.status = data.get('status', project.status)
        project.featured = data.get('featured', project.featured)
        project.risk_and_challenges = data.get('risk_and_challenges', project.risk_and_challenges)
        project.video_url = data.get('video_url', project.video_url)
        
        db.session.commit()
        return project
    except SQLAlchemyError as e:
        db.session.rollback()
        raise Exception(f"Error updating project: {e}")

def delete_project(project_id):
    """Delete a project."""
    try:
        project = get_project_by_id(project_id)
        db.session.delete(project)
        db.session.commit()
        return True
    except SQLAlchemyError as e:
        db.session.rollback()
        raise Exception(f"Error deleting project: {e}")
