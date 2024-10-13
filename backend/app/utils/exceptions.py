# app/utils/exceptions.py

class CrowdfundingException(Exception):
    """Base exception class for the crowdfunding application."""
    def __init__(self, message, code=None):
        self.message = message
        self.code = code
        super().__init__(self.message)

class ValidationError(CrowdfundingException):
    """Exception raised for validation errors in the application."""
    def __init__(self, message="Validation error occurred", code="VALIDATION_ERROR"):
        super().__init__(message, code)

class NotFoundError(CrowdfundingException):
    """Base exception for resource not found errors."""
    def __init__(self, message="Resource not found", code="NOT_FOUND"):
        super().__init__(message, code)

class CategoryNotFoundError(NotFoundError):
    """Exception raised when a category is not found."""
    def __init__(self, category_id, message=None, code="CATEGORY_NOT_FOUND"):
        message = message or f"Category with id {category_id} not found"
        super().__init__(message, code)

class ProjectNotFoundError(NotFoundError):
    """Exception raised when a project is not found."""
    def __init__(self, project_id, message=None, code="PROJECT_NOT_FOUND"):
        message = message or f"Project with id {project_id} not found"
        super().__init__(message, code)

class UserNotFoundError(NotFoundError):
    """Exception raised when a user is not found."""
    def __init__(self, user_id, message=None, code="USER_NOT_FOUND"):
        message = message or f"User with id {user_id} not found"
        super().__init__(message, code)

# class InsufficientFundsError(CrowdfundingException):
#     """Exception raised when there are insufficient funds for an operation."""
#     def __init__(self, message="Insufficient funds", code="INSUFFICIENT_FUNDS"):
#         super().__init__(message, code)

# class PaymentProcessingError(CrowdfundingException):
#     """Exception raised when there's an error processing a payment."""
#     def __init__(self, message="Error processing payment", code="PAYMENT_PROCESSING_ERROR"):
#         super().__init__(message, code)

# class AuthorizationError(CrowdfundingException):
#     """Exception raised for authorization-related errors."""
#     def __init__(self, message="Authorization error", code="AUTHORIZATION_ERROR"):
#         super().__init__(message, code)

class RateLimitExceededError(CrowdfundingException):
    """Exception raised when rate limit is exceeded."""
    def __init__(self, message="Rate limit exceeded", code="RATE_LIMIT_EXCEEDED"):
        super().__init__(message, code)

# Add any other custom exceptions here as needed