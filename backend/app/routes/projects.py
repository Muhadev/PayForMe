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
from app.models.enums import ProjectStatus
from app.utils.file_utils import handle_file_upload
from app.utils.project_utils import validate_project_data
from werkzeug.datastructures import CombinedMultiDict


# logging.basicConfig(level=logging.DEBUG)
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
        data['status'] = ProjectStatus.DRAFT  # Enum instance, not the value
        data['creator_id'] = get_jwt_identity()

        # Log the data before validation
        logger.info(f"Data before validation: {data}")

        # Validate project data
        validated_data = validate_project_data(data, is_draft=True)
        logger.info(f"Validated data: {validated_data}")  # Log the validated data

        # Create the new project using validated data
        new_project = create_project(validated_data)

        return api_response(data=new_project.to_dict(), message="Draft project created successfully", status_code=201)
    except ValidationError as e:
        logger.warning(f"Validation error in create_draft_project: {e}")
        return api_response(message=str(e), status_code=400)
    except Exception as e:
        logger.error(f"Error in create_draft_project: {str(e)}")
        return api_response(message="An unexpected error occurred", status_code=500)

@projects_bp.route('/projects', methods=['POST'])
@jwt_required()
@limiter.limit("5 per minute")
def create_new_project():
    try:
        logger.info(f"Request method: {request.method}")
        logger.info(f"Request headers: {request.headers}")

        # Handle form data or JSON data
        if request.content_type.startswith('multipart/form-data'):
            # Handle form data with file uploads
            form_data = CombinedMultiDict([request.form, request.files])
            data = {key: value for key, value in form_data.items()}
            files = request.files
            logger.info(f"Multipart form data received: {data}")
        elif request.is_json:
            # Handle JSON data
            data = request.json
            files = {}
            logger.info(f"JSON data received: {data}")
        else:
            return api_response(message="Unsupported Media Type", status_code=415)


        if not data:
            return api_response(message="No data received in the request", status_code=400)

        # Handle featured field as boolean
        if 'featured' in data:
            featured_value = data['featured'].lower() if isinstance(data['featured'], str) else data['featured']
            if featured_value == 'true':
                data['featured'] = True
            elif featured_value == 'false':
                data['featured'] = False
        
        # Handle file uploads
        if 'video_file' in files:
            video_file = files['video_file']
            data['video_url'] = handle_file_upload(
                video_file,
                current_app.config['ALLOWED_VIDEO_EXTENSIONS'],
                current_app.config['UPLOAD_FOLDER'],
                is_draft=False
            )

        if 'image_file' in files:
            image_file = files['image_file']
            data['image_url'] = handle_file_upload(
                image_file,
                current_app.config['ALLOWED_EXTENSIONS'],
                current_app.config['UPLOAD_FOLDER'],
                is_draft=False
            )

        data['creator_id'] = get_jwt_identity()

        # Log the received data
        logger.info(f"Processed data for new project: {data}")

        is_draft = data.get('is_draft', False)
        # data['status'] = data.get('status', ProjectStatus.DRAFT.value if is_draft else ProjectStatus.PENDING.value)

        # Validate project data
        validated_data = validate_project_data(data, is_draft=is_draft)
        logger.info(f"Validated data: {validated_data}")  # Log the validated data

        new_project = create_project(validated_data)
        return api_response(data=new_project.to_dict(), message="Project created successfully", status_code=201)
    except ValidationError as e:
        return api_response(message=str(e), status_code=400)
    except Exception as e:
        logger.error(f'Error creating project: {str(e)}', exc_info=True)
        return api_response(message=f"An unexpected error occurred: {str(e)}", status_code=500)
        
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
        current_user_id = get_jwt_identity()

        try:
            project = get_project_by_id(draft_id)
        except ProjectNotFoundError as e:
            return api_response(message=str(e), status_code=404)

        if project.creator_id != current_user_id:
            return api_response(message="Not authorized to update this project", status_code=403)
        if project.status != ProjectStatus.DRAFT:
            return api_response(message="Only draft projects can be updated through this endpoint", status_code=400)

        data = request.json
        validated_data = validate_project_data(data, is_draft=True)
        
        updated_project = update_project(draft_id, validated_data)
        
        return api_response(
            data=updated_project.to_dict(),
            message="Draft project updated successfully",
            status_code=200
        )

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
        if request.is_json:
            data = request.get_json()  # Get JSON data if content type is application/json
        else:
            data = request.form.to_dict()  # Fallback to form data for form submissions

        logger.info(f"Request data: {data}")
        data['creator_id'] = get_jwt_identity()

        # Handle status update
        if 'status' in data:
            try:
                data['status'] = ProjectStatus.from_string(data['status'])  # Use the Enum directly
            except ValueError as e:
                return api_response(message=str(e), status_code=400)

        logger.info(f"Request files: {request.files}")

        # Handle file uploads
        if 'video_file' in request.files:
            video_file = request.files['video_file']
            data['video_url'] = handle_file_upload(
                video_file,
                current_app.config['ALLOWED_VIDEO_EXTENSIONS'],
                current_app.config['UPLOAD_FOLDER'],
                is_draft=False  # Assuming this is not a draft project
            )
            logger.info(f"Video uploaded: {data['video_url']}")

        if 'image_file' in request.files:
            image_file = request.files['image_file']
            data['image_url'] = handle_file_upload(
                image_file,
                current_app.config['ALLOWED_EXTENSIONS'],
                current_app.config['UPLOAD_FOLDER'],
                is_draft=False
            )
            logger.info(f"Image uploaded: {data['image_url']}")


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