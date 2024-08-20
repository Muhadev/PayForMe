# app/routes/projects.py

from flask import Blueprint, request, jsonify
from app import jwt, limiter
from flask_jwt_extended import jwt_required
import logging
from app.services.project_service import (
    create_project, get_project_by_id, update_project, delete_project
)

# Initialize logger
logger = logging.getLogger(__name__)

projects_bp = Blueprint('projects', __name__)

@jwt_required()
@limiter.limit("5 per minute")
@projects_bp.route('/projects', methods=['POST'])
def create_new_project():
    """Create a new crowdfunding project."""
    data = request.json
    try:
        new_project = create_project(data)
        logger.info(f'Project created successfully with ID: {new_project.id}')
        return jsonify({
            'message': 'Project created successfully',
            'project': new_project.id  # Assuming you want to return the new project's ID
        }), 201
    except Exception as e:
        logger.error(f'Error creating project: {e}')
        return jsonify({'error': str(e)}), 500

@projects_bp.route('/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    """Retrieve details of a specific project."""
    try:
        project = get_project_by_id(project_id)
        logger.info(f'Project retrieved successfully with ID: {project.id}')
        return jsonify({
            'id': project.id,
            'title': project.title,
            'description': project.description,
            'goal_amount': project.goal_amount,
            'current_amount': project.current_amount,
            'start_date': project.start_date,
            'end_date': project.end_date,
            'status': project.status,
            'featured': project.featured,
            'risk_and_challenges': project.risk_and_challenges,
            'video_url': project.video_url,
            'creator_id': project.creator_id,
            'category_id': project.category_id
        }), 200
    except Exception as e:
        logger.error(f'Error retrieving project with ID {project_id}: {e}')
        return jsonify({'error': str(e)}), 404


@projects_bp.route('/projects/<int:project_id>', methods=['PUT'])
def update_existing_project(project_id):
    """Update a project information."""
    data = request.json
    try:
        updated_project = update_project(project_id, data)
        logger.info(f'Project updated successfully with ID: {updated_project.id}')
        return jsonify({
            'message': 'Project updated successfully',
            'project': updated_project.id
        }), 200

    except Exception as e:
        logger.error(f'Error updating project with ID {project_id}: {e}')
        return jsonify({'error': str(e)}), 500

@projects_bp.route('/projects/<int:project_id>', methods=['DELETE'])
def delete_existing_project(project_id):
    """Delete a project."""
    try:
        delete_project(project_id)
        logger.info(f'Project deleted successfully with ID: {project_id}')
        return jsonify({
            'message': 'Project deleted successfully'
        }), 200

    except Exception as e:
        logger.error(f'Error deleting project with ID {project_id}: {e}')
        return jsonify({'error': str(e)}), 500
