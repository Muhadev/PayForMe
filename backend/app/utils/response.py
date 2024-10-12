# app/utils/response.py

from flask import jsonify

def api_response(data=None, message=None, status_code=200, meta=None):
    response = {
        "status": "success" if status_code < 400 else "error",
        "message": message or "",
        "data": data or {},
        "meta": meta or {}
    }
    return jsonify(response), status_code

def success_response(data=None, message="Operation successful", meta=None):
    return api_response(data=data, message=message, status_code=200, meta=meta)

def error_response(message="An error occurred", status_code=400, meta=None):
    return api_response(message=message, status_code=status_code, meta=meta)
