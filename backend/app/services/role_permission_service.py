from app.models import User, Role, Permission
import logging
from app import db

logger = logging.getLogger(__name__)

class RolePermissionService:
    @staticmethod
    def assign_role_to_user(user_id, role_name):
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"User not found for ID {user_id}")
            return False, "User not found"

        role = Role.query.filter_by(name=role_name).first()
        if not role:
            logger.warning(f"Role {role_name} not found")
            return False, "Role not found"

        user.roles.append(role)
        db.session.commit()
        logger.info(f"Role {role_name} assigned to user {user.username}")
        return True, "Role assigned successfully"

    @staticmethod
    def revoke_role_from_user(user_id, role_name):
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"User not found for ID {user_id}")
            return False, "User not found"

        role = Role.query.filter_by(name=role_name).first()
        if not role or role not in user.roles:
            logger.warning(f"Role {role_name} not found or not assigned to user {user.username}")
            return False, "Role not found or not assigned to user"

        user.roles.remove(role)
        db.session.commit()
        logger.info(f"Role {role_name} revoked from user {user.username}")
        return True, "Role revoked successfully"

    @staticmethod
    def get_user_permissions(user_id):
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"User not found for ID {user_id}")
            return None

        permissions = set()
        for role in user.roles:
            for permission in role.permissions:
                permissions.add(permission.name)

        return list(permissions)
