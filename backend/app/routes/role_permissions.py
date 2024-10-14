# app/routes/role_permissions.py

from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.role_permission_service import RolePermissionService
from app.utils.response import api_response
from app.utils.decorators import permission_required
from app.models import User, Role
import os
from app import db
from app.models.user import User  # Adjust the import path as necessary
import logging

logger = logging.getLogger(__name__)

role_permissions_bp = Blueprint('role_permissions', __name__)

@role_permissions_bp.route('/<int:id>/assign-role', methods=['PUT'])
@jwt_required()
@permission_required('assign_role')
def assign_role(id):
    data = request.get_json()
    # Validate that the role is provided in the request
    if not data or 'role' not in data:
        logger.warning(f"Assign role attempt with missing role data for user {id}")
        return api_response(message="Role not provided", status_code=400)

    role_name = data['role']  # Role to be assigned

    # Attempt to assign the role to the user
    result = RolePermissionService.assign_roles_to_user(id, [role_name])

    if result["success"]:
        logger.info(f"Role {data['role']} assigned to user {id}")
        return api_response(message=result["message"], status_code=200)
    else:
        logger.warning(f"Failed to assign role to user {id}: {result['message']}")
        return api_response(message=result["message"], status_code=400)

@role_permissions_bp.route('/<int:id>/revoke-role', methods=['PUT'])
@jwt_required()
@permission_required('revoke_role')
def revoke_role(id):
    data = request.get_json()
    if not data or 'role' not in data:
        logger.warning(f"Revoke role attempt with missing role data for user {id}")
        return api_response(message="Role not provided", status_code=400)

    result = RolePermissionService.revoke_roles_from_user(id, [data['role']])
    if result["success"]:
        logger.info(f"Role {data['role']} revoked from user {id}")
        return api_response(message=result["message"], status_code=200)
    else:
        logger.warning(f"Failed to revoke role from user {id}: {result['message']}")
        return api_response(message=result["message"], status_code=400)

@role_permissions_bp.route('/promote-first-admin/<int:user_id>', methods=['POST'])
@jwt_required()
def promote_first_admin(user_id):
    # Check if there are any existing admin users
    admin_role = Role.query.filter_by(name='Admin').first()
    if admin_role and User.query.filter(User.roles.contains(admin_role)).first():
        return api_response(message="An admin user already exists", status_code=400)

    # Check if the provided secret key matches
    secret_key = current_app.config.get('FIRST_ADMIN_SECRET_KEY')
    if not secret_key or secret_key != os.environ.get('FIRST_ADMIN_SECRET_KEY'):
        return api_response(message="Invalid or missing secret key", status_code=403)

    user = User.query.get(user_id)
    if not user:
        return api_response(message="User not found", status_code=404)

    if admin_role:
        user.roles.append(admin_role)
    else:
        return api_response(message="Admin role not found", status_code=404)

    db.session.commit()
    return api_response(message="User promoted to first Admin", status_code=200)

@role_permissions_bp.route('/promote-to-admin/<int:user_id>', methods=['POST'])
@jwt_required()
def promote_to_admin(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    # Check if the current user is an admin
    if not any(role.name == 'Admin' for role in current_user.roles):
        logger.warning(f"Non-admin user {current_user_id} attempted to promote user {user_id} to admin")
        return api_response(message="Only admins can promote users to admin status", status_code=403)

    user_to_promote = User.query.get(user_id)
    if not user_to_promote:
        logger.warning(f"Attempt to promote non-existent user {user_id} to admin")
        return api_response(message="User not found", status_code=404)

    admin_role = Role.query.filter_by(name='Admin').first()
    if not admin_role:
        logger.error("Admin role not found in the database")
        return api_response(message="Admin role not found", status_code=500)

    if admin_role in user_to_promote.roles:
        logger.info(f"User {user_id} is already an admin")
        return api_response(message="User is already an admin", status_code=400)

    user_to_promote.roles.append(admin_role)
    db.session.commit()

    logger.info(f"User {user_id} promoted to admin by user {current_user_id}")
    return api_response(message="User successfully promoted to admin", status_code=200)

@role_permissions_bp.route('/<int:id>/permissions', methods=['GET'])
@jwt_required()
@permission_required('view_permissions')
def get_permissions(id):
    result = RolePermissionService.get_user_permissions(id)
    if result["success"]:
        logger.info(f"Permissions retrieved for user {id}")
        return api_response(data={"permissions": result["permissions"]}, status_code=200)
    else:
        logger.warning(f"Failed to retrieve permissions for user {id}: {result['message']}")
        return api_response(message=result["message"], status_code=404)


@role_permissions_bp.route('/<int:id>/roles', methods=['GET'])
@jwt_required()
def get_user_roles(id):
    user = User.query.get(id)
    if not user:
        return api_response(message="User not found", status_code=404)
    roles = [role.name for role in user.roles]
    return api_response(data={"roles": roles}, status_code=200)

@role_permissions_bp.route('/roles/<int:role_id>/permissions', methods=['GET'])
@jwt_required()
def get_role_permissions(role_id):
    role = Role.query.get(role_id)
    if not role:
        return api_response(message="Role not found", status_code=404)
    permissions = [perm.name for perm in role.permissions]
    return api_response(data={"role": role.name, "permissions": permissions}, status_code=200)
