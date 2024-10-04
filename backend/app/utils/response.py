# app/utils/response.py

from flask import jsonify

def api_response(data=None, message=None, status_code=200, meta=None):
    response = {
        "status": "success" if status_code < 400 else "error",
        "message": message if message else "",
        "data": data if data is not None else {},
        "meta": meta if meta else {}
    }
    return jsonify(response), status_code