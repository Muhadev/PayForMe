# sharing.py
from urllib.parse import quote
from flask import current_app
from flask_jwt_extended import decode_token
from datetime import datetime, timedelta

def generate_share_link(project_id: int, user_id: int = None, expiry_days: int = 7) -> dict:
    """Generate sharing information and links for a project."""
    # Use FRONTEND_URL instead of BASE_URL since this will be shared to frontend users
    base_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3000')
    
    token_payload = {
        'project_id': project_id,
        'shared_by': user_id,
        'exp': datetime.utcnow() + timedelta(days=expiry_days)
    }
    
    share_token = current_app.extensions['flask-jwt-extended'].create_access_token(
        identity=user_id,
        additional_claims=token_payload
    )
    
    # Create the shareable URL that points to the frontend
    share_url = f"{base_url}/projects/shared/{share_token}"
    
    encoded_url = quote(share_url)
    
    sharing_info = {
        'direct_link': share_url,
        'expires_at': token_payload['exp'].isoformat(),
        'social_links': {
            'twitter': f"https://twitter.com/intent/tweet?url={encoded_url}",
            'facebook': f"https://www.facebook.com/sharer/sharer.php?u={encoded_url}",
            'linkedin': f"https://www.linkedin.com/sharing/share-offsite/?url={encoded_url}",
            'email': f"mailto:?subject=Check out this project&body={encoded_url}"
        }
    }
    
    return sharing_info

def validate_share_link(share_token: str) -> dict:
    """
    Validate a share token and return the project information if valid.
    
    Args:
        share_token (str): The token to validate
        
    Returns:
        dict: Dictionary containing the decoded token payload
        
    Raises:
        jwt.InvalidTokenError: If the token is invalid or expired
    """
    # Use the existing JWT manager to decode and validate the token
    decoded_token = decode_token(share_token)
    return decoded_token

def get_share_link_metadata(project_data: dict) -> dict:
    """
    Generate metadata for social sharing.
    
    Args:
        project_data (dict): Dictionary containing project information
        
    Returns:
        dict: Dictionary containing metadata for social sharing
    """
    description = project_data.get('description', '')
    if len(description) > 200:
        description = description[:197] + '...'
        
    return {
        'title': project_data.get('title', ''),
        'description': description,
        'image_url': project_data.get('image_url'),
        'type': 'website',
        'card': 'summary_large_image'
    }