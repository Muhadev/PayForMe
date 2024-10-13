# app/utils/input_sanitizer.py

import bleach

def sanitize_input(data):
    """
    Sanitize input data to prevent XSS attacks.
    """
    if isinstance(data, dict):
        return {k: sanitize_input(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_input(i) for i in data]
    elif isinstance(data, str):
        return bleach.clean(data)
    else:
        return data