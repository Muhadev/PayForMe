# app/routes/backer_routes.py

from flask import Blueprint, request
from app.services.backer_service import BackerService
from app.utils.response import success_response, error_response

backer_bp = Blueprint('backer_bp', __name__)
backer_service = BackerService()

@backer_bp.route('/projects/<int:project_id>/back', methods=['POST'])
def back_project(project_id):
    data = request.json
    result = backer_service.back_project(project_id, data)
    if 'error' in result:
        return error_response(message=result['error'], status_code=result.get('status_code', 400))
    return success_response(data=result, message="Project backed successfully")

@backer_bp.route('/projects/<int:project_id>/backers', methods=['GET'])
def list_project_backers(project_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    result = backer_service.get_project_backers(project_id, page, per_page)
    if 'error' in result:
        return error_response(message=result['error'], status_code=result.get('status_code', 404))
    return success_response(data=result['backers'], meta=result['meta'])

@backer_bp.route('/users/<int:user_id>/backed-projects', methods=['GET'])
def list_user_backed_projects(user_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    result = backer_service.get_user_backed_projects(user_id, page, per_page)
    if 'error' in result:
        return error_response(message=result['error'], status_code=result.get('status_code', 404))
    return success_response(data=result['projects'], meta=result['meta'])

@backer_bp.route('/projects/<int:project_id>/backers/<int:user_id>', methods=['GET'])
def get_backer_details(project_id, user_id):
    result = backer_service.get_backer_details(project_id, user_id)
    if 'error' in result:
        return error_response(message=result['error'], status_code=result.get('status_code', 404))
    return success_response(data=result)

@backer_bp.route('/projects/<int:project_id>/backers/stats', methods=['GET'])
def get_backer_stats(project_id):
    result = backer_service.get_backer_stats(project_id)
    if 'error' in result:
        return error_response(message=result['error'], status_code=result.get('status_code', 404))
    return success_response(data=result)

@backer_bp.route('/projects/<int:project_id>/send-update', methods=['POST'])
def send_project_update(project_id):
    data = request.json
    result = backer_service.send_project_update_email(project_id, data['title'], data['content'])
    if 'error' in result:
        return error_response(message=result['error'], status_code=result.get('status_code', 404))
    return success_response(message=result['message'])

@backer_bp.route('/projects/<int:project_id>/send-milestone', methods=['POST'])
def send_project_milestone(project_id):
    data = request.json
    result = backer_service.send_project_milestone_email(project_id, data['title'], data['description'])
    if 'error' in result:
        return error_response(message=result['error'], status_code=result.get('status_code', 404))
    return success_response(message=result['message'])