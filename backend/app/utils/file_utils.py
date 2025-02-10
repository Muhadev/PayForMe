import os
import logging
from typing import Optional, Set, Union, Tuple
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
from flask import current_app
from werkzeug.datastructures import FileStorage
from .exceptions import ValidationError

# Set up logging
logger = logging.getLogger(__name__)

def allowed_file(filename: str, allowed_extensions: Set[str]) -> bool:
    """
    Check if a filename has an allowed extension.
    
    Args:
        filename (str): The name of the file to check
        allowed_extensions (set): Set of allowed file extensions
    
    Returns:
        bool: True if file extension is allowed, False otherwise
    """
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def get_file_subfolder(extension: str) -> Tuple[str, str]:
    """
    Determine the correct subfolder and base path for a file based on its extension.
    
    Args:
        extension (str): The file extension
        
    Returns:
        Tuple[str, str]: (subfolder name, base path)
        
    Raises:
        ValidationError: If the file type is not supported
    """
    if extension in ['jpg', 'jpeg', 'png', 'gif']:
        return 'photos', current_app.config['UPLOADED_PHOTOS_DEST']
    elif extension in ['mp4', 'avi', 'mov', 'webm']:
        return 'videos', current_app.config['UPLOADED_VIDEOS_DEST']
    else:
        raise ValidationError(f"Unsupported file type: {extension}")

def handle_file_upload(file: FileStorage, allowed_extensions: Set[str], upload_folder: str, is_draft: bool = False) -> Optional[str]:
    """
    Handle file upload based on file type.
    
    Args:
        file (FileStorage): The uploaded file
        allowed_extensions (Set[str]): Set of allowed file extensions
        upload_folder (str): Base upload folder path
        is_draft (bool): Whether this is a draft upload
        
    Returns:
        Optional[str]: The URL path for the uploaded file, or None if no file
        
    Raises:
        ValidationError: If there's an error with the file or upload process
        RequestEntityTooLarge: If the file size exceeds the limit
    """
    if not file or file.filename == '':
        return None
        
    try:
        # Get the extension and validate it
        if '.' not in file.filename:
            raise ValidationError("No file extension found")
            
        extension = file.filename.rsplit('.', 1)[1].lower()
        if not allowed_file(file.filename, allowed_extensions):
            raise ValidationError(f"File type .{extension} is not supported")

        filename = secure_filename(file.filename)
        
        # Get the correct subfolder and base path
        subfolder, base_path = get_file_subfolder(extension)
        
        # Create full save path
        save_path = os.path.join(base_path, filename)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        
        # Check file size before saving
        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)
        
        max_size = current_app.config.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024)  # Default 16MB
        if size > max_size:
            raise RequestEntityTooLarge()
        
        # Save the file
        file.save(save_path)
        
        logger.info(f"File uploaded successfully: {save_path}")
        
        # Return the URL path that will be stored in database
        return f'/uploads/{subfolder}/{filename}'
        
    except RequestEntityTooLarge:
        logger.error(f"File size exceeds limit: {file.filename}")
        raise
    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        raise ValidationError(f"Failed to upload file: {str(e)}")