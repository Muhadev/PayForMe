# app/utils/response.py

from flask import jsonify

def api_response(data=None, message=None, status_code=200):
    response = {
        "status": "success" if status_code < 400 else "error",
        "message": message,
        "data": data
    }
    return jsonify(response), status_code