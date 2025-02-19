# services/project_role_service.py
from app import db
from app.models.project_role import ProjectRole
import logging

logger = logging.getLogger(__name__)

class ProjectRoleService:
    @staticmethod
    def assign_project_role(user_id: int, project_id: int, role: str) -> bool:
        try:
            # Check if role already exists
            existing_role = ProjectRole.query.filter_by(
                user_id=user_id,
                project_id=project_id,
                role=role
            ).first()
            
            if existing_role:
                return True
                
            project_role = ProjectRole(
                user_id=user_id,
                project_id=project_id,
                role='creator'  # Always use 'creator' for project creators
            )
            db.session.add(project_role)
            db.session.commit()
            return True
        except Exception as e:
            logger.error(f"Error assigning project role: {e}")
            db.session.rollback()
            return False

    @staticmethod
    def get_user_project_roles(user_id: int, project_id: int) -> dict:
        # Modified to return more detailed role information
        project_role = ProjectRole.query.filter_by(
            user_id=user_id,
            project_id=project_id,
            role='creator'
        ).first()
        
        return {
            "roles": ["creator"] if project_role else [],
            "isCreator": project_role is not None
        }

    @staticmethod
    def is_project_creator(user_id: int, project_id: int) -> bool:
        return ProjectRole.query.filter_by(
            user_id=user_id,
            project_id=project_id,
            role='creator'
        ).first() is not None

    @staticmethod
    def remove_project_role(user_id: int, project_id: int, role: str) -> bool:
        try:
            ProjectRole.query.filter_by(
                user_id=user_id,
                project_id=project_id,
                role=role
            ).delete()
            db.session.commit()
            return True
        except Exception as e:
            logger.error(f"Error removing project role: {e}")
            db.session.rollback()
            return False