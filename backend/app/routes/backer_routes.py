# app/routes/backer_routes.py

from flask import Blueprint, request, current_app, url_for
from app.services.backer_service import BackerService
from app.utils.response import success_response, error_response
from app.utils.decorators import permission_required
from app.utils.rate_limit import rate_limit
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
@rate_limit(limit=5, per=60)
@permission_required('back_project')
def back_project(project_id):
    """
    Endpoint for backing a project.
    
    This function handles the process of a user backing a project, including
    input validation, calling the service layer, and returning the appropriate response.
    """
    logger.info(f"Attempting to back project {project_id}")
    
    try:
        schema = BackProjectSchema()
        sanitized_data = sanitize_input(request.json)
        data = schema.load(sanitized_data)
        
        current_user_id = get_jwt_identity()
        
        # Log the payload and user ID
        logger.info(f"Payload: {sanitized_data}")
        logger.info(f"Current User ID: {current_user_id}")
        
        # Create initial donation record
        result = backer_service.back_project(project_id, current_user_id, data)
        
        if 'error' in result:
            return error_response(message=result['error'], 
                                status_code=result.get('status_code', 400))

        if 'donation' not in result:
            return error_response(message="Failed to create donation", 
                                status_code=500)
        
        # Create Stripe checkout session
        donation_id = result['donation']['id']
        success_url = url_for('backer_bp.payment_success', 
                            donation_id=donation_id, _external=True)
        cancel_url = url_for('backer_bp.payment_cancel', 
                           donation_id=donation_id, _external=True)
        
        checkout_session = backer_service.donation_service.create_checkout_session(
            donation_id=donation_id,
            success_url=success_url,
            cancel_url=cancel_url
        )
        
        if not checkout_session:
            return error_response(message="Failed to create payment session", 
                                status_code=500)
        
        return success_response(data={
            'checkout_url': checkout_session.url,
            'session_id': checkout_session.id
        })
        
    except ValidationError as err:
        logger.warning(f"Validation error in back_project: {err.messages}")
        return error_response(message=err.messages, status_code=400)
    except Exception as e:
        logger.error(f"Unexpected error in back_project: {str(e)}")
        return error_response(message="An unexpected error occurred", 
                            status_code=500)

@backer_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    """
    Handle Stripe webhooks for payment events.
    """
    logger.info("Received Stripe webhook")
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')

    if not sig_header:
        logger.error("Missing Stripe-Signature header")
        return error_response(message="No signature header", status_code=400)

    success = backer_service.donation_service.handle_webhook(payload, sig_header)
    
    if not success:
        return error_response(message="Invalid webhook", status_code=400)
        
    return success_response(message="Webhook processed successfully")

@backer_bp.route('/donations/<int:donation_id>/success')
@jwt_required()
def payment_success(donation_id):
    """
    Handle successful payment redirect.
    """
    # You can add additional logic here if needed
    return success_response(message="Payment processed successfully")

@backer_bp.route('/donations/<int:donation_id>/cancel')
@jwt_required()
def payment_cancel(donation_id):
    """
    Handle cancelled payment.
    """
    # You can add logic to handle cancelled payments
    return error_response(message="Payment was cancelled", status_code=400)

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

    current_user_id = get_jwt_identity()
    logger.info(f"User {current_user_id} requesting backed projects for user {user_id}")

    result = backer_service.get_user_backed_projects(user_id, page, per_page)
    if 'error' in result:
        logger.error(f"Error in list_user_backed_projects: {result['error']}")
        return error_response(message=result['error'], status_code=result.get('status_code', 404))

    logger.info(f"Successfully retrieved backed projects for user {user_id}")
    return success_response(data=result['projects'], meta=result['meta'])

@backer_bp.route('/projects/<int:project_id>/backers/<int:user_id>', methods=['GET'])
@jwt_required()
@permission_required('view_backer_details')
def get_backer_details(project_id, user_id):
    """
    Endpoint for retrieving details of a specific backer for a project.
    
    This function gets detailed information about a user's backing of a specific project.
    """
    current_user_id = get_jwt_identity()
    logger.info(f"User {current_user_id} requesting backer details for user {user_id} on project {project_id}")
    
    result = backer_service.get_backer_details(project_id, user_id)
    if 'error' in result:
        logger.error(f"Error in get_backer_details: {result['error']}")
        return error_response(message=result['error'], status_code=result.get('status_code', 404))

    logger.info(f"Successfully retrieved backer details for user {user_id} on project {project_id}")
    return success_response(data=result)

@backer_bp.route('/projects/<int:project_id>/backers/stats', methods=['GET'])
@jwt_required()
@rate_limit(limit=10, per=60)
@permission_required('view_backer_stats')
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