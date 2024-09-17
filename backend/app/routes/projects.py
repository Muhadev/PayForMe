# app/routes/projects.py

from flask import Blueprint, request, current_app, send_from_directory
from app import jwt, limiter
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from app.services.project_service import (
    create_project, get_project_by_id, update_project, delete_project, get_all_projects, get_user_drafts
)
from app.utils.exceptions import ProjectNotFoundError, ValidationError
from app.utils.response import api_response
from app.utils.file_utils import handle_file_upload

logger = logging.getLogger(__name__)

projects_bp = Blueprint('projects', __name__)

@projects_bp.route('/uploads/<filename>', methods=['GET'])
def uploaded_file(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

@projects_bp.before_request
@limiter.limit("100 per minute")
def limit_blueprint_requests():
    pass

@projects_bp.route('/projects/drafts', methods=['POST'])
@jwt_required()
def create_draft_project():
    try:
        data = request.json
        data['status'] = 'draft'
        data['creator_id'] = get_jwt_identity()
        new_project = create_project(data)
        return api_response(data=new_project.to_dict(), message="Draft project created successfully", status_code=201)
    except ValidationError as e:
        return api_response(message=str(e), status_code=400)
    except Exception as e:
        logger.error(f'Error creating draft project: {e}')
        return api_response(message="An unexpected error occurred", status_code=500)

@projects_bp.route('/projects', methods=['POST'])
@jwt_required()
@limiter.limit("5 per minute")
def create_new_project():
    try:
        data = request.form.to_dict()
        data['creator_id'] = get_jwt_identity()
        data['video_file'] = request.files.get('video')
        data['image_file'] = request.files.get('image')
        new_project = create_project(data)
        return api_response(data=new_project.to_dict(), message="Project created successfully", status_code=201)
    except ValidationError as e:
        return api_response(message=str(e), status_code=400)
    except Exception as e:
        logger.error(f'Error creating project: {e}')
        return api_response(message="An unexpected error occurred", status_code=500)

@projects_bp.route('/projects/drafts', methods=['GET'])
@jwt_required()
def get_user_draft_projects():
    try:
        user_id = get_jwt_identity()
        drafts = get_user_drafts(user_id)
        return api_response(data={'drafts': [draft.to_dict() for draft in drafts]}, status_code=200)
    except Exception as e:
        logger.error(f'Error retrieving draft projects: {e}')
        return api_response(message="An unexpected error occurred", status_code=500)

@projects_bp.route('/projects/drafts/<int:draft_id>', methods=['PUT'])
@jwt_required()
def update_draft_project(draft_id):
    try:
        data = request.json
        data['status'] = 'draft'
        data['creator_id'] = get_jwt_identity()
        updated_project = update_project(draft_id, data)
        return api_response(data=updated_project.to_dict(), message="Draft project updated successfully", status_code=200)
    except ValidationError as e:
        return api_response(message=str(e), status_code=400)
    except ProjectNotFoundError as e:
        return api_response(message=str(e), status_code=404)
    except Exception as e:
        logger.error(f'Error updating draft project with ID {draft_id}: {e}')
        return api_response(message="An unexpected error occurred", status_code=500)

@projects_bp.route('/projects/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_existing_project(project_id):
    try:
        data = request.form.to_dict()
        data['creator_id'] = get_jwt_identity()

        if 'image' in request.files:
            data['image_url'] = handle_file_upload(
                request.files['image'],
                current_app.config['ALLOWED_EXTENSIONS'],
                current_app.config['UPLOAD_FOLDER'],
                is_draft=False
            )

        if 'video' in request.files:
            data['video_url'] = handle_file_upload(
                request.files['video'],
                current_app.config['ALLOWED_VIDEO_EXTENSIONS'],
                current_app.config['UPLOAD_FOLDER'],
                is_draft=False
            )

        updated_project = update_project(project_id, data)
        return api_response(data=updated_project.to_dict(), message="Project updated successfully", status_code=200)
    except ValidationError as e:
        return api_response(message=str(e), status_code=400)
    except ProjectNotFoundError as e:
        return api_response(message=str(e), status_code=404)
    except Exception as e:
        logger.error(f'Error updating project with ID {project_id}: {e}')
        return api_response(message="An unexpected error occurred", status_code=500)

@projects_bp.route('/projects/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_existing_project(project_id):
    try:
        delete_project(project_id)
        return api_response(message="Project soft deleted successfully", status_code=200)
    except ProjectNotFoundError as e:
        return api_response(message=str(e), status_code=404)
    except Exception as e:
        logger.error(f'Error soft deleting project with ID {project_id}: {e}')
        return api_response(message="An unexpected error occurred", status_code=500)

@projects_bp.route('/projects', methods=['GET'])
def get_projects():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        filters = {k: v for k, v in request.args.items() if k not in ['page', 'per_page', 'sort_by', 'sort_order']}
        
        projects_pagination = get_all_projects(page, per_page, sort_by, sort_order, filters)
        projects = projects_pagination.items
        
        return api_response(data={
            'projects': [project.to_dict() for project in projects],
            'total': projects_pagination.total,
            'pages': projects_pagination.pages,
            'current_page': page,
            'sort_by': sort_by,
            'sort_order': sort_order,
            'filters': filters
        }, status_code=200)
    except Exception as e:
        logger.error(f'Error retrieving projects: {e}')
        return api_response(message="An unexpected error occurred", status_code=500)