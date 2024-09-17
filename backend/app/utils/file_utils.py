# app/utils/file_utils.py

import os
from werkzeug.utils import secure_filename
from flask import current_app
from .exceptions import ValidationError

def allowed_file(filename: str, allowed_extensions: set) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def handle_file_upload(file, allowed_extensions: set, upload_folder: str, is_draft: bool) -> str:
    if is_draft:
        return ''  # Skip file upload for draft projects

    if not file:
        raise ValidationError("File is required")

    if not allowed_file(file.filename, allowed_extensions):
        raise ValidationError(f"Invalid file format. Allowed formats: {', '.join(allowed_extensions)}")

    try:
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)  # Reset file pointer to beginning
        
        if file_size > current_app.config['MAX_CONTENT_LENGTH']:
            raise ValidationError("File size exceeds the limit")

        filename = save_file(file, upload_folder)
        return f"/uploads/{filename}"
    except IOError as e:
        current_app.logger.error(f"Error handling file upload: {e}")
        raise ValidationError("Error processing file upload")

def save_file(file, upload_folder: str) -> str:
    filename = secure_filename(file.filename)
    file_path = os.path.join(upload_folder, filename)
    
    if not os.path.commonpath([file_path, upload_folder]) == os.path.abspath(upload_folder):
        raise ValidationError("Invalid file path")
    
    try:
        file.save(file_path)
        return filename
    except IOError as e:
        current_app.logger.error(f"Error saving file: {e}")
        raise ValidationError("Error saving file")