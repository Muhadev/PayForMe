# app/services/category_service.py

from app.models.category import Category
from app import db
from app.utils.exceptions import CategoryNotFoundError

def create_category(name):
    """Create a new category."""
    new_category = Category(name=name)
    db.session.add(new_category)
    db.session.commit()
    return new_category

def get_category_by_id(category_id):
    """Retrieve a category by its ID."""
    category = Category.query.get(category_id)
    if not category:
        raise CategoryNotFoundError(f"Category with ID {category_id} not found")
    return category

def get_all_categories():
    """Retrieve all categories."""
    return Category.query.all()

def update_category(category_id, name):
    """Update an existing category."""
    category = get_category_by_id(category_id)
    category.name = name
    db.session.commit()
    return category

def delete_category(category_id):
    """Delete a category by its ID."""
    category = get_category_by_id(category_id)
    db.session.delete(category)
    db.session.commit()
    return True