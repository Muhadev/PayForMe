# app/utils/response.py

from flask import jsonify
from typing import Optional, Any, Dict, Union

def api_response(
    data: Optional[Any] = None, 
    message: Optional[str] = None, 
    status_code: int = 200, 
    meta: Optional[Dict] = None,
    errors: Optional[Union[Dict, list, str]] = None
) -> tuple:
    """
    Creates a standardized API response.
    
    Args:
        data: The main response data
        message: A message describing the response
        status_code: HTTP status code
        meta: Additional metadata
        errors: Validation errors or error details
    """
    response = {
        "status": "success" if status_code < 400 else "error",
        "message": message or "",
        "data": data or {},
        "meta": meta or {}
    }
    
    # Add errors to response if present
    if errors:
        response["errors"] = errors

    return jsonify(response), status_code

def success_response(
    data: Optional[Any] = None, 
    message: str = "Operation successful", 
    meta: Optional[Dict] = None
) -> tuple:
    """Creates a success response"""
    return api_response(data=data, message=message, status_code=200, meta=meta)

def error_response(
    message: str = "An error occurred", 
    status_code: int = 400, 
    meta: Optional[Dict] = None,
    errors: Optional[Union[Dict, list, str]] = None
) -> tuple:
    """Creates an error response with optional validation errors"""
    return api_response(
        message=message, 
        status_code=status_code, 
        meta=meta, 
        errors=errors
    )

def validation_error_response(
    errors: Union[Dict, list, str],
    message: str = "Validation error",
    status_code: int = 400
) -> tuple:
    """
    Creates a response specifically for validation errors.
    
    Args:
        errors: Validation error details
        message: Error message
        status_code: HTTP status code (default 400)
    """
    return api_response(
        message=message,
        status_code=status_code,
        errors=errors
    )