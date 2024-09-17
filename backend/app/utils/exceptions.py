# app/utils/exceptions.py

class ValidationError(Exception):
    """Custom exception for validation errors in the application."""
    pass

class ProjectNotFoundError(Exception):
    """Exception raised when a project is not found."""
    pass