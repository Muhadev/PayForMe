# app/routes/backer_routes.py

from flask import Blueprint, request, current_app
from app.services.backer_service import BackerService
from app.utils.response import success_response, error_response
from app.utils.decorators import permission_required, rate_limit
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from app.schemas.backer_schemas import (
    BackProjectSchema,
    ProjectUpdateSchema,
    ProjectMilestoneSchema
)
import logging
from app.utils.input_sanitizer import sanitize_input

backer_bp = Blueprint('backer_bp', __name__)
backer_service = BackerService()
logger = logging.getLogger(__name__)

@backer_bp.route('/projects/<int:project_id>/back', methods=['POST'])
@jwt_required()
@permission_required('back_project')
@rate_limit(limit=5, per=60)
def back_project(project_id):
    """
    Endpoint for backing a project.
    
    This function handles the process of a user backing a project, including
    input validation, calling the service layer, and returning the appropriate response.
    """
    schema = BackProjectSchema()
    try:
        sanitized_data = sanitize_input(request.json)
        data = schema.load(sanitized_data)
    except ValidationError as err:
        logger.warning(f"Validation error in back_project: {err.messages}")
        return error_response(message=err.messages, status_code=400)

    current_user_id = get_jwt_identity()
    result = backer_service.back_project(project_id, current_user_id, data)
    if 'error' in result:
        logger.error(f"Error in back_project: {result['error']}")
        return error_response(message=result['error'], status_code=result.get('status_code', 400))
    
    logger.info(f"User {current_user_id} successfully backed project {project_id}")
    return success_response(data=result, message="Project backed successfully")

@backer_bp.route('/projects/<int:project_id>/backers', methods=['GET'])
@jwt_required()
@permission_required('view_backers')
def list_project_backers(project_id):
    """
    Endpoint for listing backers of a project.
    
    This function retrieves a paginated list of backers for a specific project.
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    result = backer_service.get_project_backers(project_id, page, per_page)
    if 'error' in result:
        logger.error(f"Error in list_project_backers: {result['error']}")
        return error_response(message=result['error'], status_code=result.get('status_code', 404))
    return success_response(data=result['backers'], meta=result['meta'])

@backer_bp.route('/users/<int:user_id>/backed-projects', methods=['GET'])
@jwt_required()
@permission_required('view_user_backed_projects')
def list_user_backed_projects(user_id):
    """
    Endpoint for listing projects backed by a user.
    
    This function retrieves a paginated list of projects that a specific user has backed.
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    result = backer_service.get_user_backed_projects(user_id, page, per_page)
    if 'error' in result:
        logger.error(f"Error in list_user_backed_projects: {result['error']}")
        return error_response(message=result['error'], status_code=result.get('status_code', 404))
    return success_response(data=result['projects'], meta=result['meta'])

@backer_bp.route('/projects/<int:project_id>/backers/<int:user_id>', methods=['GET'])
@jwt_required()
@permission_required('view_backer_details')
def get_backer_details(project_id, user_id):
    """
    Endpoint for retrieving details of a specific backer for a project.
    
    This function gets detailed information about a user's backing of a specific project.
    """
    result = backer_service.get_backer_details(project_id, user_id)
    if 'error' in result:
        logger.error(f"Error in get_backer_details: {result['error']}")
        return error_response(message=result['error'], status_code=result.get('status_code', 404))
    return success_response(data=result)

@backer_bp.route('/projects/<int:project_id>/backers/stats', methods=['GET'])
@jwt_required()
@permission_required('view_backer_stats')
@rate_limit(limit=10, per=60)
def get_backer_stats(project_id):
    """
    Endpoint for retrieving backer statistics for a project.
    
    This function gets aggregated statistics about backers for a specific project.
    """
    result = backer_service.get_backer_stats(project_id)
    if 'error' in result:
        logger.error(f"Error in get_backer_stats: {result['error']}")
        return error_response(message=result['error'], status_code=result.get('status_code', 404))
    return success_response(data=result)

@backer_bp.route('/projects/<int:project_id>/send-update', methods=['POST'])
@jwt_required()
@permission_required('send_project_update')
def send_project_update(project_id):
    """
    Endpoint for sending a project update to backers.
    
    This function handles the process of sending an update email to all backers
    of a specific project.
    """
    schema = ProjectUpdateSchema()
    try:
        sanitized_data = sanitize_input(request.json)
        data = schema.load(sanitized_data)
    except ValidationError as err:
        logger.warning(f"Validation error in send_project_update: {err.messages}")
        return error_response(message=err.messages, status_code=400)

    result = backer_service.send_project_update_email(project_id, data['title'], data['content'])
    if 'error' in result:
        logger.error(f"Error in send_project_update: {result['error']}")
        return error_response(message=result['error'], status_code=result.get('status_code', 404))
    
    logger.info(f"Project update sent for project {project_id}")
    return success_response(message=result['message'])

@backer_bp.route('/projects/<int:project_id>/send-milestone', methods=['POST'])
@jwt_required()
@permission_required('send_project_milestone')
def send_project_milestone(project_id):
    """
    Endpoint for sending a project milestone update to backers.
    
    This function handles the process of sending a milestone update email to all backers
    of a specific project.
    """
    schema = ProjectMilestoneSchema()
    try:
        sanitized_data = sanitize_input(request.json)
        data = schema.load(sanitized_data)
    except ValidationError as err:
        logger.warning(f"Validation error in send_project_milestone: {err.messages}")
        return error_response(message=err.messages, status_code=400)

    result = backer_service.send_project_milestone_email(project_id, data['title'], data['description'])
    if 'error' in result:
        logger.error(f"Error in send_project_milestone: {result['error']}")
        return error_response(message=result['error'], status_code=result.get('status_code', 404))
    
    logger.info(f"Project milestone sent for project {project_id}")
    return success_response(message=result['message'])