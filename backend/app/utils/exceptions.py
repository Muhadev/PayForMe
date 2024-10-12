# app/utils/exceptions.py

class ValidationError(Exception):
    """Custom exception for validation errors in the application."""
    pass

class CategoryNotFoundError(Exception):
    """Exception raised when a category is not found."""
    pass

# Add any other custom exceptions here
class ProjectNotFoundError(Exception):
    """Exception raised when a project is not found."""
    pass