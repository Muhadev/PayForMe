from flask import Blueprint, request, jsonify
from app.models import Project, User, Donation
from app import db

project_bp = Blueprint('project_bp', __name__)

@project_bp.route('/projects/<int:id>/back', methods=['POST'])
def back_project(id):
    user_id = request.json.get('user_id')
    amount = request.json.get('amount')

    project = Project.query.get(id)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    backer = Donation(user_id=user.id, project_id=project.id, amount=amount)
    db.session.add(backer)
    db.session.commit()

    return jsonify({"message": "Project backed successfully"}), 201

@project_bp.route('/projects/<int:id>/backers', methods=['GET'])
def list_project_backers(id):
    project = Project.query.get(id)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    backers = Donation.query.filter_by(project_id=id).all()
    backers_list = [{
        "user_id": backer.user_id,
        "amount": backer.amount,
        "created_at": backer.create_at
    } for backer in backers]

    return jsonify(backers_list), 200

@project_bp.route('/users/<int:id}/backed-projects', methods=['GET'])
def list_user_backed_projects(id):
    user = User.query.get(id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    backed_projects = Donation.query.filter_by(user_id=id).all()
    projects_list = [{
        "project_id": back.project_id,
        "amount": back.amount,
        "created_at": back.created_at
    } for back in backed_projects]

    return jsonify(projects_list), 200
