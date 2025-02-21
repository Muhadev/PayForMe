# app/routes/projects.py

from flask import Blueprint, jsonify, request, url_for, current_app, send_from_directory, abort
from app import jwt, limiter
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
import logging
from app.services.project_service import (
    create_project, get_project_by_id, update_project, delete_project, get_all_projects, get_user_drafts, activate_project
)
from app.utils.exceptions import ProjectNotFoundError, ValidationError
from app.utils.response import api_response
from app.models.enums import ProjectStatus
from app.utils.file_utils import handle_file_upload
from app.models.saved_project import SavedProject
from app import db
from app.services.project_role_service import ProjectRoleService
from app.models.project import Project
from datetime import datetime
from app.utils.project_utils import validate_project_data
from werkzeug.datastructures import CombinedMultiDict
from app.utils.decorators import permission_required
from app.services.notification_service import NotificationService
from app.services.email_service import send_templated_email
from app.utils.rate_limit import rate_limit
import os
from app.utils.sharing import generate_share_link, validate_share_link
from sqlalchemy import or_, and_  

# logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

projects_bp = Blueprint('projects', __name__)

@projects_bp.before_request
def handle_preflight():
    if request.method == 'OPTIONS':
        response = current_app.make_default_options_response()
        return response

@projects_bp.route('/uploads/<path:filename>/')
# @jwt_required()
def uploaded_file(filename):
    """Serve uploaded files with proper MIME types"""
    try:
        logger.info(f"Attempting to serve file: {filename}")
        
        # Split the path to get subfolder and actual filename
        parts = filename.split('/')
        if len(parts) != 2:
            logger.error(f"Invalid file path format: {filename}")
            return api_response(message="Invalid file path", status_code=400)
            
        subfolder, actual_filename = parts
        
        # Determine the correct upload directory based on subfolder
        if subfolder == 'photos':
            upload_dir = current_app.config['UPLOADED_PHOTOS_DEST']
        elif subfolder == 'videos':
            upload_dir = current_app.config['UPLOADED_VIDEOS_DEST']
        else:
            logger.error(f"Invalid subfolder requested: {subfolder}")
            return api_response(message="Invalid subfolder", status_code=400)
        
        if not os.path.exists(os.path.join(upload_dir, actual_filename)):
            logger.error(f"File not found: {actual_filename} in {upload_dir}")
            abort(404)
            
        logger.info(f"Serving file from directory: {upload_dir}")
        logger.info(f"File name: {actual_filename}")
        
        response = send_from_directory(
            upload_dir,
            actual_filename,
            as_attachment=False
        )
        
        # Add CORS headers
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type'
        
        return response
        
    except Exception as e:
        logger.error(f"Error serving uploaded file {filename}: {str(e)}")
        return api_response(message="File not found", status_code=404)

@projects_bp.before_request
@limiter.limit("100 per minute")
def limit_blueprint_requests():
    pass

@projects_bp.route('/drafts', methods=['POST'], strict_slashes=False)
@jwt_required()
@permission_required('create_draft')
def create_draft_project():
    try:
        data = {}
        if request.content_type and request.content_type.startswith('multipart/form-data'):
            # Handle form data
            data = request.form.to_dict()
            
            # Handle image
            if 'image_file' in request.files:
                image_file = request.files['image_file']
                if image_file and image_file.filename:
                    data['image_url'] = handle_file_upload(
                        image_file,
                        current_app.config['ALLOWED_EXTENSIONS'],
                        current_app.config['UPLOADED_PHOTOS_DEST'],
                        is_draft=True
                    )
            elif 'image_url' in data:
                # Validate image URL if provided
                ProjectValidator.validate_image_url(data['image_url'])
            
            # Handle video
            if 'video_file' in request.files:
                video_file = request.files['video_file']
                if video_file and video_file.filename:
                    data['video_url'] = handle_file_upload(
                        video_file,
                        current_app.config['ALLOWED_VIDEO_EXTENSIONS'],
                        current_app.config['UPLOADED_VIDEOS_DEST'],
                        is_draft=True
                    )
            elif 'video_url' in data:
                # Validate video URL if provided
                ProjectValidator.validate_video_url(data['video_url'])
        else:
            # Handle JSON data
            data = request.get_json()

        if not data:
            return api_response(message="No data received", status_code=400)

        # Set draft status
        data['status'] = ProjectStatus.DRAFT
        data['creator_id'] = get_jwt_identity()

        # Validate and create project
        validated_data = validate_project_data(data, is_draft=True)
        new_project = create_project(validated_data)

        return api_response(
            data=new_project.to_dict(),
            message="Draft project created successfully",
            status_code=201
        )

    except ValidationError as e:
        logger.error(f"Validation error in create_draft_project: {str(e)}")
        return api_response(message=str(e), status_code=400)
    except RequestEntityTooLarge:
        logger.error("File size too large")
        return api_response(
            message="File size exceeds the maximum allowed limit", 
            status_code=413
        )
    except Exception as e:
        logger.error(f"Error in create_draft_project: {str(e)}", exc_info=True)
        return api_response(message="An unexpected error occurred", status_code=500)

@projects_bp.route('', methods=['POST'], strict_slashes=False)
@jwt_required()
@permission_required('create_project')
@rate_limit(limit=5, per=60)  # 5 requests per minute
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

        # Add detailed logging before validation
        logger.info(f"About to validate data: {data}")
        validated_data = validate_project_data(data, is_draft=is_draft)
        logger.info(f"Validation passed, validated data: {validated_data}")

        new_project = create_project(validated_data)
        return api_response(data=new_project.to_dict(), message="Project created successfully", status_code=201)
    except ValidationError as e:
        logger.error(f"Validation error in create_new_project: {str(e)}")
        return api_response(message=str(e), errors=e.errors if hasattr(e, 'errors') else None, status_code=400)
    except Exception as e:
        logger.error(f'Error creating project: {str(e)}', exc_info=True)
        return api_response(message=f"An unexpected error occurred: {str(e)}", status_code=500)


@projects_bp.route('/<int:project_id>/roles', methods=['GET'])
@jwt_required()
def get_project_roles(project_id):
    current_user_id = get_jwt_identity()
    
    # Get project roles with enhanced information
    role_info = ProjectRoleService.get_user_project_roles(current_user_id, project_id)
    
    return api_response(data=role_info, status_code=200)

@projects_bp.route('/drafts/<int:draft_id>', methods=['GET', 'PUT'])
@jwt_required()
@permission_required('view_drafts')
def handle_draft_project(draft_id):
    try:
        if request.method == 'GET':
            project = get_project_by_id(draft_id)
            if project.status != ProjectStatus.DRAFT:
                return api_response(message="Project is not a draft", status_code=400)
            return api_response(data=project.to_dict(), status_code=200)
        
        elif request.method == 'PUT':
            current_user_id = get_jwt_identity()
            project = get_project_by_id(draft_id)
            
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

    except ProjectNotFoundError as e:
        return api_response(message=str(e), status_code=404)
    except Exception as e:
        logger.error(f'Error handling draft project with ID {draft_id}: {e}')
        return api_response(message="An unexpected error occurred", status_code=500)
        
@projects_bp.route('/drafts', methods=['GET'])
@jwt_required()
@permission_required('view_drafts')
def get_user_draft_projects():
    try:
        # Debug logging
        current_token = get_jwt()
        current_time = datetime.utcnow().timestamp()
        exp_time = current_token.get('exp', 0)
        
        logger.info(f"Current time (UTC): {current_time}")
        logger.info(f"Token expiration: {exp_time}")
        logger.info(f"Time until expiration: {exp_time - current_time} seconds")

        user_id = get_jwt_identity()
        drafts = get_user_drafts(user_id)
        return api_response(data={'drafts': [draft.to_dict() for draft in drafts]}, status_code=200)
    except Exception as e:
        logger.error(f'Error retrieving draft projects: {str(e)}', exc_info=True)
        return api_response(message=str(e), status_code=500)

@projects_bp.route('/drafts/<int:draft_id>', methods=['PUT'])
@jwt_required()
@permission_required('edit_draft')
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

@projects_bp.route('/<int:project_id>', methods=['PUT'])
@jwt_required()
@permission_required('edit_own_project')
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

@projects_bp.route('/<int:project_id>', methods=['DELETE'])
@jwt_required()
@permission_required('delete_project')
def delete_existing_project(project_id):
    try:
        delete_project(project_id)
        return api_response(message="Project soft deleted successfully", status_code=200)
    except ProjectNotFoundError as e:
        return api_response(message=str(e), status_code=404)
    except Exception as e:
        logger.error(f'Error soft deleting project with ID {project_id}: {e}')
        return api_response(message="An unexpected error occurred", status_code=500)

@projects_bp.route('/<int:project_id>', methods=['GET'])
@jwt_required()
@permission_required('view_projects')
def get_project(project_id):
    """Get a single project by ID"""
    try:
        project = get_project_by_id(project_id)
        return api_response(data=project.to_dict(), status_code=200)
    except ProjectNotFoundError as e:
        return api_response(message=str(e), status_code=404)
    except Exception as e:
        logger.error(f"Error fetching project {project_id}: {str(e)}")
        return api_response(message="Failed to fetch project", status_code=500)

@projects_bp.route('/', methods=['GET'])
@jwt_required()
@permission_required('view_projects')
def get_projects():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        # Get current user info
        current_user_id = get_jwt_identity()
        jwt_data = get_jwt()
        user_roles = jwt_data.get('roles', [])
        
        # Base query
        query = Project.query
        
        # For MyProjectsPage, we want to show only the user's own projects
        # Check if this is a request for user's own projects
        is_my_projects = request.args.get('my_projects', 'false').lower() == 'true'
        
        if is_my_projects:
            # Show only the user's own projects
            query = query.filter(Project.creator_id == current_user_id)
        else:
            # For other pages (like CategoryProjectsPage), show only active projects
            # unless the user is viewing their own project
            query = query.filter(
                or_(
                    Project.status == ProjectStatus.ACTIVE,
                    and_(
                        Project.creator_id == current_user_id,
                        Project.status.in_([ProjectStatus.DRAFT, ProjectStatus.PENDING])
                    )
                )
            )
        
        # Apply status filter if provided
        status_filter = request.args.get('status')
        if status_filter and status_filter.lower() != 'all':
            try:
                status = ProjectStatus.from_string(status_filter)
                query = query.filter(Project.status == status)
            except ValueError:
                pass
        
        # Apply additional filters from request
        filters = {k: v for k, v in request.args.items() 
                  if k not in ['page', 'per_page', 'sort_by', 'sort_order', 'my_projects', 'status']}
                  
        for key, value in filters.items():
            if hasattr(Project, key):
                query = query.filter(getattr(Project, key) == value)
        
        # Apply sorting
        if hasattr(Project, sort_by):
            sort_column = getattr(Project, sort_by)
            if sort_order == 'desc':
                sort_column = sort_column.desc()
            query = query.order_by(sort_column)
            
        # Execute query with pagination
        projects_pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return api_response(data={
            'projects': [project.to_dict() for project in projects_pagination.items],
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
        
@projects_bp.route('/<int:project_id>/share', methods=['POST'])
@jwt_required()
def share_project(project_id):
    """Generate sharing information for a project"""
    try:
        project = get_project_by_id(project_id)
        
        # Allow sharing of active, funded, successful, and completed projects
        allowed_statuses = [
            ProjectStatus.ACTIVE, 
            ProjectStatus.FUNDED,
            ProjectStatus.SUCCESSFUL, 
            ProjectStatus.COMPLETED
        ]
        
        if project.status not in allowed_statuses:
            return api_response(
                message="Only active, funded, successful, or completed projects can be shared", 
                status_code=400
            )
        
        # Get current user ID from JWT token
        current_user_id = get_jwt_identity()
        
        # Generate sharing links and information
        share_info = generate_share_link(project_id, current_user_id)
        
        return api_response(
            data=share_info, 
            message="Share information generated successfully", 
            status_code=200
        )
        
    except ProjectNotFoundError as e:
        return api_response(message=str(e), status_code=404)
    except jwt.InvalidTokenError as e:
        return api_response(message=str(e), status_code=400)
    except Exception as e:
        logger.error(f"Error generating share information for project {project_id}: {str(e)}")
        return api_response(message="Failed to generate share information", status_code=500)
        
@projects_bp.route('/pending', methods=['GET'])
@jwt_required()
@permission_required('view_pending_projects')
def get_pending_projects():
    """Get all pending projects for admin review"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        pending_projects = Project.query.filter_by(status=ProjectStatus.PENDING)\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        return api_response(
            data={
                'projects': [project.to_dict() for project in pending_projects.items],
                'total': pending_projects.total,
                'pages': pending_projects.pages,
                'current_page': page
            },
            status_code=200
        )
    except Exception as e:
        logger.error(f"Error fetching pending projects: {str(e)}")
        return api_response(message="Failed to fetch pending projects", status_code=500)

@projects_bp.route('/<int:project_id>', methods=['GET'])
def view_project(project_id):
    """
    Get detailed information about a specific project.
    Public endpoint that handles both authenticated and unauthenticated access.
    """
    try:
        # Get the project from database
        project = get_project_by_id(project_id)
        
        # Check if project exists and is in a viewable state
        if not project:
            return api_response(message="Project not found", status_code=404)
            
        # Define viewable statuses
        viewable_statuses = [
            ProjectStatus.ACTIVE,
            ProjectStatus.FUNDED,
            ProjectStatus.SUCCESSFUL,
            ProjectStatus.COMPLETED
        ]
        
        # Get current user if authenticated
        current_user_id = None
        try:
            current_user_id = get_jwt_identity()
        except Exception:
            # User is not authenticated
            pass
            
        # Check viewing permissions
        if project.status not in viewable_statuses:
            # If project is not in viewable status, only creator and admins can view it
            if not current_user_id:
                return api_response(
                    message="You don't have permission to view this project",
                    status_code=403
                )
                
            # Check if user has admin role or is the creator
            jwt_data = get_jwt()
            user_roles = jwt_data.get('roles', [])
            
            if current_user_id != project.creator_id and 'Admin' not in user_roles:
                return api_response(
                    message="You don't have permission to view this project",
                    status_code=403
                )
        
        # Prepare the response data
        project_data = project.to_dict()
        
        # Add additional fields for authenticated users
        if current_user_id:
            project_data['is_owner'] = (current_user_id == project.creator_id)
            
            # Add edit/delete permissions based on user role
            jwt_data = get_jwt()
            user_roles = jwt_data.get('roles', [])
            project_data['can_edit'] = (
                current_user_id == project.creator_id or 
                'Admin' in user_roles
            )
            project_data['can_delete'] = (
                current_user_id == project.creator_id or 
                'Admin' in user_roles
            )
            
            # Add backing information if user has backed the project
            # Assuming you have a Backing model and relationship
            if hasattr(project, 'backings'):
                user_backing = next(
                    (backing for backing in project.backings 
                     if backing.backer_id == current_user_id),
                    None
                )
                project_data['user_backing'] = user_backing.to_dict() if user_backing else None
        
        # Increment view count
        project.view_count = project.view_count + 1 if project.view_count else 1
        db.session.commit()
        
        # Add share URL
        project_data['share_url'] = url_for(
            'projects.view_project',
            project_id=project.id,
            _external=True
        )
        
        return api_response(
            data=project_data,
            status_code=200
        )
        
    except ProjectNotFoundError as e:
        return api_response(message=str(e), status_code=404)
    except Exception as e:
        logger.error(f"Error viewing project {project_id}: {str(e)}")
        return api_response(
            message="An error occurred while retrieving the project",
            status_code=500
        )

# Then in the activation route, modify the email sending part:
@projects_bp.route('/<int:project_id>/activate', methods=['POST'])
@jwt_required()
@permission_required('activate_project')
def activate_project_route(project_id):
    try:
        project = activate_project(project_id)
        
        try:
            # Send notification to project creator
            NotificationService.create_notification(
                user_id=project.creator_id,
                message=f"Your project '{project.title}' has been approved and is now active!",
                project_id=project.id
            )
            
            # Send email notification with additional context
            project_url = url_for('projects.view_project', project_id=project.id, _external=True)
            send_templated_email(
                project.creator.email,
                'project_activated',
                project=project,
                project_url=project_url,
                project_title=project.title,
                creator_name=project.creator.full_name or project.creator.username
            )
        except Exception as notification_error:
            logger.error(f"Error sending notifications for project {project_id}: {notification_error}")
            
        return api_response(message="Project activated successfully", status_code=200)
    except ValidationError as e:
        return api_response(message=str(e), status_code=400)
    except ProjectNotFoundError as e:
        return api_response(message=str(e), status_code=404)
    except Exception as e:
        logger.error(f"Error activating project {project_id}: {str(e)}")
        return api_response(message="Failed to activate project", status_code=500)

@projects_bp.route('/<int:project_id>/revoke', methods=['POST'])
@jwt_required()
@permission_required('revoke_project')
def revoke_project_route(project_id):
    try:
        project = get_project_by_id(project_id)
        
        # Log the current project status for debugging
        logger.info(f"Attempting to revoke project {project_id} with current status: {project.status}")
        
        # Convert string status to enum if needed
        current_status = (
            project.status if isinstance(project.status, ProjectStatus) 
            else ProjectStatus.from_string(project.status)
        )
        
        # Check if project can be revoked (both ACTIVE and PENDING projects can be revoked)
        allowed_statuses = [ProjectStatus.ACTIVE, ProjectStatus.PENDING]
        if current_status not in allowed_statuses:
            return api_response(
                message=(
                    f"Cannot revoke project in {current_status} status. "
                    "Only active or pending projects can be revoked."
                ),
                status_code=400
            )
        
        # Update project status to revoked
        try:
            project.status = ProjectStatus.REVOKED
            db.session.commit()
            
            logger.info(f"Successfully updated project {project_id} status to REVOKED")
            
        except Exception as db_error:
            logger.error(f"Database error while revoking project {project_id}: {str(db_error)}")
            db.session.rollback()
            raise
            
        # Send notifications
        try:
            NotificationService.create_notification(
                user_id=project.creator_id,
                message=(
                    f"Your project '{project.title}' has been revoked. "
                    "Please contact support for more information."
                ),
                project_id=project.id
            )
            
            # Send email notification
            send_templated_email(
                project.creator.email,
                'project_revoked',
                project=project,
                project_title=project.title,
                creator_name=project.creator.full_name or project.creator.username,
                revocation_reason="This project has been revoked by an administrator."
            )
            
        except Exception as notification_error:
            logger.error(
                f"Error sending revocation notifications for project {project_id}: "
                f"{notification_error}"
            )
            # Continue execution even if notifications fail
            
        # Return the updated project data
        return api_response(
            data={
                **project.to_dict(),
                'status': ProjectStatus.REVOKED.value  # Ensure we return the string value
            },
            message="Project revoked successfully",
            status_code=200
        )
        
    except ProjectNotFoundError as e:
        logger.error(f"Project not found error for ID {project_id}: {str(e)}")
        return api_response(message=str(e), status_code=404)
        
    except Exception as e:
        logger.error(f"Unexpected error revoking project {project_id}: {str(e)}")
        return api_response(
            message="An unexpected error occurred while revoking the project",
            status_code=500
        )

@projects_bp.route('/<int:project_id>/feature', methods=['POST'])
@jwt_required()
@permission_required('feature_project')
def toggle_project_feature(project_id):
    try:
        project = get_project_by_id(project_id)
        
        # Toggle featured status
        project.featured = not project.featured
        db.session.commit()
        
        # Send notification to project creator
        action = "featured" if project.featured else "unfeatured"
        try:
            NotificationService.create_notification(
                user_id=project.creator_id,
                message=f"Your project '{project.title}' has been {action}!",
                project_id=project.id
            )
            
            template_name = f'project_{action}'
            # Send email notification
            send_templated_email(
                project.creator.email,
                template_name,
                project=project,
                project_title=project.title,
                creator_name=project.creator.full_name or project.creator.username
            )
        except Exception as notification_error:
            logger.error(f"Error sending feature notifications for project {project_id}: {notification_error}")
            
        return api_response(
            data=project.to_dict(),
            message=f"Project {action} successfully",
            status_code=200
        )
        
    except ProjectNotFoundError as e:
        return api_response(message=str(e), status_code=404)
    except Exception as e:
        logger.error(f"Error featuring project {project_id}: {str(e)}")
        return api_response(message="Failed to update project feature status", status_code=500)

@projects_bp.route('/admin/pending-projects', methods=['GET'])
@jwt_required()
@permission_required('activate_project')
def admin_pending_projects():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Use filters to get only pending projects
        filters = {'status': ProjectStatus.PENDING}
        projects_pagination = get_all_projects(page, per_page, 'created_at', 'desc', filters)
        
        return api_response(data={
            'projects': [project.to_dict() for project in projects_pagination.items],
            'total': projects_pagination.total,
            'pages': projects_pagination.pages,
            'current_page': page
        }, status_code=200)
    except Exception as e:
        logger.error(f"Error fetching pending projects: {str(e)}")
        return api_response(message="Failed to fetch pending projects", status_code=500)

@projects_bp.route('/<int:project_id>/save', methods=['POST'])
@jwt_required()
def save_project(project_id):
    """Save a project for a user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if project exists
        project = get_project_by_id(project_id)
        
        # Check if already saved
        existing_save = SavedProject.query.filter_by(
            user_id=current_user_id,
            project_id=project_id
        ).first()
        
        if existing_save:
            return api_response(
                message="Project already saved",
                status_code=200
            )
        
        # Create new saved project entry
        saved_project = SavedProject(
            user_id=current_user_id,
            project_id=project_id
        )
        
        db.session.add(saved_project)
        db.session.commit()
        
        return api_response(
            message="Project saved successfully",
            status_code=201
        )
        
    except ProjectNotFoundError as e:
        return api_response(message=str(e), status_code=404)
    except Exception as e:
        logger.error(f"Error saving project {project_id}: {str(e)}")
        db.session.rollback()
        return api_response(
            message="Failed to save project",
            status_code=500
        )

@projects_bp.route('/<int:project_id>/save', methods=['DELETE'])
@jwt_required()
def unsave_project(project_id):
    """Unsave a project for a user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Find the saved project
        saved_project = SavedProject.query.filter_by(
            user_id=current_user_id,
            project_id=project_id
        ).first()
        
        if not saved_project:
            return api_response(
                message="Project was not saved",
                status_code=404
            )
        
        # Delete the saved project entry
        db.session.delete(saved_project)
        db.session.commit()
        
        return api_response(
            message="Project unsaved successfully",
            status_code=200
        )
        
    except Exception as e:
        logger.error(f"Error unsaving project {project_id}: {str(e)}")
        db.session.rollback()
        return api_response(
            message="Failed to unsave project",
            status_code=500
        )

@projects_bp.route('/saved', methods=['GET'])
@jwt_required()
def get_saved_projects():
    """Get all saved projects for the current user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Query saved projects with pagination
        saved_projects_query = SavedProject.query.filter_by(user_id=current_user_id)
        saved_projects_paginated = saved_projects_query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Get the actual project data for each saved project
        projects = []
        for saved_project in saved_projects_paginated.items:
            try:
                project = get_project_by_id(saved_project.project_id)
                project_dict = project.to_dict()
                
                # Add the saved_at date from the SavedProject model
                project_dict['saved_at'] = saved_project.created_at.isoformat()
                
                # Include category information if it exists
                if project.category:
                    project_dict['category_name'] = project.category.name
                    
                projects.append(project_dict)
            except ProjectNotFoundError:
                continue
        
        return api_response(
            data={
                'projects': projects,
                'total': saved_projects_paginated.total,
                'pages': saved_projects_paginated.pages,
                'current_page': page
            },
            status_code=200
        )
        
    except Exception as e:
        logger.error(f"Error retrieving saved projects: {str(e)}")
        return api_response(
            message="Failed to retrieve saved projects",
            status_code=500
        )

@projects_bp.route('/search', methods=['GET'])
def search_projects():
    """Search for active projects"""
    try:
        query = request.args.get('q', '')
        category_id = request.args.get('category_id')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Base query for active projects
        projects_query = Project.query.filter_by(status=ProjectStatus.ACTIVE)
        
        # Add search filter if query is provided
        if query:
            search_filter = or_(
                Project.title.ilike(f'%{query}%'),
                Project.description.ilike(f'%{query}%')
            )
            projects_query = projects_query.filter(search_filter)
            
        # Add category filter if provided
        if category_id:
            projects_query = projects_query.filter_by(category_id=category_id)
            
        # Add order by to ensure consistent results
        projects_query = projects_query.order_by(Project.created_at.desc())
            
        # Execute query with pagination
        projects = projects_query.paginate(
            page=page, 
            per_page=per_page,
            error_out=False
        )
        
        # Transform the results to include necessary fields for the frontend
        project_list = [{
            'id': p.id,
            'title': p.title,
            'description': p.description,
            'image_url': p.image_url,
            'category_name': p.category.name if p.category else 'Uncategorized',
            'created_at': p.created_at.isoformat() if p.created_at else None
        } for p in projects.items]
        
        return api_response(
            data={
                'projects': project_list,
                'total': projects.total,
                'pages': projects.pages,
                'current_page': page
            },
            status_code=200
        )
        
    except Exception as e:
        logger.error(f"Error searching projects: {str(e)}")
        return api_response(message="Search failed", status_code=500)