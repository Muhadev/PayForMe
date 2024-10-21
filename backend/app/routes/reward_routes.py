from flask import Blueprint, request, current_app
from app.services.reward_service import RewardService
from app.utils.response import success_response, error_response
from app.utils.decorators import permission_required
from app.utils.rate_limit import rate_limit
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from app.schemas.reward_schemas import RewardSchema, RewardUpdateSchema
import logging
from app import cache

reward_bp = Blueprint('reward_bp', __name__)
reward_service = RewardService()
logger = logging.getLogger(__name__)

def verify_project_access(project_id, user_id):
    project = Project.query.get(project_id)
    if not project:
        return False
    return user_id == project.creator_id or user_id in [c.id for c in project.collaborators]

@reward_bp.route('/projects/<int:project_id>/rewards', methods=['POST'])
@jwt_required()
@rate_limit(limit=10, per=3600)  # 10 requests per hour (3600 seconds)
@permission_required('create_reward')
def create_reward(project_id):
    try:
        user_id = get_jwt_identity()
        if not verify_project_access(project_id, user_id):
            return error_response(message="Unauthorized access", status_code=403)

        if request.content_length > current_app.config['MAX_CONTENT_LENGTH']:
            return error_response(message="Request too large", status_code=413)
        data = request.json
        reward = reward_service.create_reward(project_id, data)
        return success_response(data=reward, message="Reward created successfully")
    except ValidationError as err:
        return error_response(message=err.messages, status_code=400)
    except Exception as e:
        logger.error(f"Error creating reward: {str(e)}")
        return error_response(message="An error occurred while creating the reward", status_code=500)

@reward_bp.route('/projects/<int:project_id>/rewards', methods=['GET'])
@jwt_required()
@cache.memoize(timeout=300)
@permission_required('list_rewards')
def list_rewards(project_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    rewards = reward_service.get_project_rewards(
        project_id, 
        page=page, 
        per_page=min(per_page, 100)
    )
    return success_response(data=rewards)

@reward_bp.route('/projects/<int:project_id>/rewards/<int:reward_id>', methods=['GET'])
@jwt_required()
@permission_required('get_reward')
def get_reward(project_id, reward_id):
    reward = reward_service.get_reward(project_id, reward_id)
    if reward:
        return success_response(data=reward)
    return error_response(message="Reward not found", status_code=404)

@reward_bp.route('/projects/<int:project_id>/rewards/<int:reward_id>', methods=['PUT'])
@jwt_required()
@permission_required('update_reward')
def update_reward(project_id, reward_id):
    try:
        data = request.json
        updated_reward = reward_service.update_reward(project_id, reward_id, data)
        cache.delete_memoized(list_rewards, project_id)
        return success_response(data=updated_reward, message="Reward updated successfully")
    except ValidationError as err:
        return error_response(message=err.messages, status_code=400)
    except Exception as e:
        logger.error(f"Error updating reward: {str(e)}")
        return error_response(message="An error occurred while updating the reward", status_code=500)

@reward_bp.route('/projects/<int:project_id>/rewards/<int:reward_id>', methods=['DELETE'])
@jwt_required()
@permission_required('delete_reward')
def delete_reward(project_id, reward_id):
    result = reward_service.delete_reward(project_id, reward_id)
    if result:
        return success_response(message="Reward deleted successfully")
    return error_response(message="Reward not found or could not be deleted", status_code=404)

@reward_bp.route('/projects/<int:project_id>/rewards/<int:reward_id>/claim', methods=['POST'])
@jwt_required()
@permission_required('claim_reward')
def claim_reward(project_id, reward_id):
    user_id = get_jwt_identity()
    result = reward_service.claim_reward(project_id, reward_id, user_id)
    if 'error' in result:
        return error_response(message=result['error'], status_code=result.get('status_code', 400))
    return success_response(data=result, message="Reward claimed successfully")