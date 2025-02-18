# app/routes/category.py

from flask import Blueprint, request, jsonify
from app.services.category_service import (
    create_category, get_category_by_id, get_all_categories, update_category, delete_category
)
from flask_jwt_extended import jwt_required
import logging
from app.utils.decorators import permission_required

# Initialize logger
logger = logging.getLogger(__name__)

categories_bp = Blueprint('categories', __name__)

@categories_bp.route('/', methods=['POST'])
@jwt_required()
@permission_required('create_category')
def create_new_category():
    """Create a new category."""
    data = request.json
    try:
        new_category = create_category(data['name'])
        logger.info(f'Category created successfully with ID: {new_category.id}')
        return jsonify({
            'message': 'Category created successfully',
            'category': {
                'id': new_category.id,
                'name': new_category.name
            }
        }), 201
    except Exception as e:
        logger.error(f'Error creating category: {e}')
        return jsonify({'error': str(e)}), 500

@categories_bp.route('/<int:category_id>', methods=['GET'])
def get_category(category_id):  # Remove @jwt_required() and @permission_required
    """Retrieve a specific category by ID."""
    try:
        category = get_category_by_id(category_id)
        if category:
            return jsonify({
                'id': category.id,
                'name': category.name
            }), 200
        else:
            return jsonify({'error': 'Category not found'}), 404
    except Exception as e:
        logger.error(f'Error retrieving category with ID {category_id}: {e}')
        return jsonify({'error': str(e)}), 500

# Update your categories endpoint view_categories
@categories_bp.route('/', methods=['GET'])
@jwt_required()
@permission_required('view_categories')
def get_all_categories_route():
    """Retrieve all categories."""
    try:
        categories = get_all_categories()
        return jsonify({
            "status": "success",
            "data": [{
                'id': category.id,
                'name': category.name
            } for category in categories]
        }), 200
    except Exception as e:
        logger.error(f'Error retrieving all categories: {e}')
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@categories_bp.route('/<int:category_id>', methods=['PUT'])
@jwt_required()
@permission_required('edit_category')
def update_existing_category(category_id):
    """Update a category."""
    data = request.json
    try:
        updated_category = update_category(category_id, data['name'])
        if updated_category:
            logger.info(f'Category updated successfully with ID: {updated_category.id}')
            return jsonify({
                'message': 'Category updated successfully',
                'category': {
                    'id': updated_category.id,
                    'name': updated_category.name
                }
            }), 200
        else:
            return jsonify({'error': 'Category not found'}), 404
    except Exception as e:
        logger.error(f'Error updating category with ID {category_id}: {e}')
        return jsonify({'error': str(e)}), 500

@categories_bp.route('/<int:category_id>', methods=['DELETE'])
@jwt_required()
@permission_required('delete_category')
def delete_existing_category(category_id):
    """Delete a category."""
    try:
        if delete_category(category_id):
            logger.info(f'Category deleted successfully with ID: {category_id}')
            return jsonify({'message': 'Category deleted successfully'}), 200
        else:
            return jsonify({'error': 'Category not found'}), 404
    except Exception as e:
        logger.error(f'Error deleting category with ID {category_id}: {e}')
        return jsonify({'error': str(e)}), 500
