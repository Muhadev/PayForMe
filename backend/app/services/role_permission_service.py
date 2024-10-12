# app/services/role_permission_service.py

from app.models import User, Role, Permission
from app import db
import logging

logger = logging.getLogger(__name__)

class RolePermissionService:
    @staticmethod
    def assign_roles_to_user(user_id, role_names):
        try:
            user = User.query.get(user_id)
            if not user:
                raise ValueError(f"User with ID {user_id} not found")

            roles_to_add = Role.query.filter(Role.name.in_(role_names)).all()
            if len(roles_to_add) != len(role_names):
                raise ValueError("One or more roles not found")

            for role in roles_to_add:
                if role not in user.roles:
                    user.roles.append(role)

            db.session.commit()
            logger.info(f"Assigned roles {role_names} to user {user.username}")
            return {"success": True, "message": "Roles assigned successfully"}

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error assigning roles: {e}")
            return {"success": False, "message": str(e)}

    @staticmethod
    def revoke_roles_from_user(user_id, role_names):
        try:
            user = User.query.get(user_id)
            if not user:
                raise ValueError(f"User with ID {user_id} not found")

            roles_to_remove = Role.query.filter(Role.name.in_(role_names)).all()
            if len(roles_to_remove) != len(role_names):
                raise ValueError("One or more roles not found")

            roles_removed = False
            for role in roles_to_remove:
                if role in user.roles:
                    user.roles.remove(role)
                    roles_removed = True

            if not roles_removed:
                raise ValueError("None of the specified roles were assigned to the user")

            db.session.commit()
            logger.info(f"Revoked roles {role_names} from user {user.username}")
            return {"success": True, "message": "Roles revoked successfully"}

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error revoking roles: {e}")
            return {"success": False, "message": str(e)}

    @staticmethod
    def get_user_permissions(user_id, use_cache=True):
        try:
            user = User.query.get(user_id)
            if not user:
                logger.error(f"User with ID {user_id} not found")
                return {"success": False, "message": f"User with ID {user_id} not found"}

            if use_cache and hasattr(user, 'cached_permissions'):
                logger.debug(f"Using cached permissions for user {user_id}")
                return {"success": True, "permissions": user.cached_permissions}

            permissions = set()
            for role in user.roles:
                logger.debug(f"Processing role: {role.name} for user {user_id}")
                permissions.update(permission.name for permission in role.permissions)

            permissions_list = list(permissions)
            logger.info(f"Fetched permissions for user {user_id}: {permissions_list}")
            
            user.cached_permissions = permissions_list
            return {"success": True, "permissions": permissions_list}

        except Exception as e:
            logger.error(f"Error fetching permissions for user {user_id}: {str(e)}")
            return {"success": False, "message": str(e)}

