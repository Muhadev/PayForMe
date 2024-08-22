# app/services/category_service.py

from app.models.category import Category
from app import db

def create_category(name):
    """Create a new category."""
    new_category = Category(name=name)
    db.session.add(new_category)
    db.session.commit()
    return new_category

def get_category_by_id(category_id):
    """Retrieve a category by its ID."""
    return Category.query.get(category_id)

def get_all_categories():
    """Retrieve all categories."""
    return Category.query.all()

def update_category(category_id, name):
    """Update an existing category."""
    category = get_category_by_id(category_id)
    if category:
        category.name = name
        db.session.commit()
        return category
    else:
        return None

def delete_category(category_id):
    """Delete a category by its ID."""
    category = get_category_by_id(category_id)
    if category:
        db.session.delete(category)
        db.session.commit()
        return True
    else:
        return False
