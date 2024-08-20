from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.role_permission_service import RolePermissionService
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Create a Blueprint for the role and permission routes
role_permissions_bp = Blueprint('role_permissions', __name__, url_prefix='/users')

@role_permissions_bp.route('/<int:id>/assign-role', methods=['PUT'])
@jwt_required()
def assign_role(id):
    data = request.get_json()
    if not data or 'role' not in data:
        logger.warning(f"Assign role attempt with missing role data for user {id}")
        return jsonify({"msg": "Role not provided"}), 400

    success, message = RolePermissionService.assign_role_to_user(id, data['role'])
    if success:
        logger.info(f"Role {data['role']} assigned to user {id}")
        return jsonify({"msg": message}), 200
    else:
        logger.warning(f"Failed to assign role to user {id}: {message}")
        return jsonify({"msg": message}), 400

@role_permissions_bp.route('/<int:id>/revoke-role', methods=['PUT'])
@jwt_required()
def revoke_role(id):
    data = request.get_json()
    if not data or 'role' not in data:
        logger.warning(f"Revoke role attempt with missing role data for user {id}")
        return jsonify({"msg": "Role not provided"}), 400

    success, message = RolePermissionService.revoke_role_from_user(id, data['role'])
    if success:
        logger.info(f"Role {data['role']} revoked from user {id}")
        return jsonify({"msg": message}), 200
    else:
        logger.warning(f"Failed to revoke role from user {id}: {message}")
        return jsonify({"msg": message}), 400

@role_permissions_bp.route('/<int:id>/permissions', methods=['GET'])
@jwt_required()
def get_permissions(id):
    permissions = RolePermissionService.get_user_permissions(id)
    if permissions is not None:
        logger.info(f"Permissions retrieved for user {id}")
        return jsonify({"permissions": permissions}), 200
    else:
        logger.warning(f"Failed to retrieve permissions for user {id}")
        return jsonify({"msg": "User not found or has no permissions"}), 404
