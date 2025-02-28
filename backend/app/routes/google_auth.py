# backend/app/routes/google_auth.py

from flask import Blueprint, redirect, url_for, session, request, current_app
from authlib.integrations.flask_client import OAuth
from app import db
from app.models.user import User
from app.models.role import Role  # Make sure to import Role explicitly
from app.services.auth_service import AuthService
from app.utils.response import success_response, error_response
from flask_jwt_extended import create_access_token, create_refresh_token
import secrets
import logging

# Configure logging
logger = logging.getLogger(__name__)

google_auth = Blueprint('google_auth', __name__)

def init_oauth(app):
    oauth = OAuth(app)
    google = oauth.register(
        name='google',
        client_id=app.config['GOOGLE_CLIENT_ID'],
        client_secret=app.config['GOOGLE_CLIENT_SECRET'],
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile'}
    )
    return google

@google_auth.before_app_request
def setup_oauth():
    global google
    google = init_oauth(current_app)

@google_auth.route('/login/google')
def login():
    state = secrets.token_urlsafe(16)
    session['oauth_state'] = state
    redirect_uri = url_for('google_auth.authorized', _external=True)
    return google.authorize_redirect(redirect_uri, state=state)

@google_auth.route('/login/google/authorized')
def authorized():
    try:
        # Check state parameter for CSRF protection
        if request.args.get('state') != session.pop('oauth_state', None):
            current_app.logger.warning("Invalid state parameter in Google OAuth callback")
            return redirect(f"{current_app.config['FRONTEND_URL']}/signin?error=invalid_state")

        # Exchange authorization code for tokens
        token = google.authorize_access_token()
        if not token:
            current_app.logger.error("Failed to get token from Google")
            return redirect(f"{current_app.config['FRONTEND_URL']}/signin?error=token_error")

        # Get user info from Google
        resp = google.get('https://www.googleapis.com/oauth2/v3/userinfo')
        user_info = resp.json()
        
        if not user_info.get('email'):
            current_app.logger.error("No email provided by Google")
            return redirect(f"{current_app.config['FRONTEND_URL']}/signin?error=no_email")

        # Find or create user
        user = User.query.filter_by(email=user_info['email']).first()
        
        if not user:
            # Create username from email
            base_username = user_info['email'].split('@')[0]
            username = base_username
            
            # Check if username already exists
            count = 1
            while User.query.filter_by(username=username).first():
                username = f"{base_username}{count}"
                count += 1
            
            # Create new user
            user = User(
                username=username,
                email=user_info['email'],
                full_name=user_info.get('name', ''),
                is_verified=True  # Auto-verify Google users
            )
            
            # Set a random secure password
            user.set_password(secrets.token_urlsafe(16))
            
            # Add user to database first to generate ID
            db.session.add(user)
            db.session.flush()
            
            # Assign the "User" role (capitalized, matching the role in auth_service.py)
            user_role = Role.query.filter_by(name="User").first()
            if user_role:
                user.roles.append(user_role)
                logger.info(f"Assigned role 'User' to new Google user: {user.email}")
            else:
                logger.error(f"'User' role not found in database")
            
            db.session.commit()
            current_app.logger.info(f"Created new user via Google OAuth: {user.email}")
        else:
            # Update existing user info if needed
            if user_info.get('name') and not user.full_name:
                user.full_name = user_info['name']
                
            # Ensure user has the User role
            has_user_role = False
            for role in user.roles:
                if role.name == "User":
                    has_user_role = True
                    break
                    
            if not has_user_role:
                user_role = Role.query.filter_by(name="User").first()
                if user_role:
                    user.roles.append(user_role)
                    logger.info(f"Added missing 'User' role to existing Google user: {user.email}")
            
            db.session.commit()
            current_app.logger.info(f"Existing user logged in via Google: {user.email} with roles: {[r.name for r in user.roles]}")

        # Generate JWT tokens with all user roles and permissions
        access_token = AuthService.create_token_for_user(user)
        refresh_token = create_refresh_token(identity=user.id)
        
        # Log user roles and permissions for debugging
        roles = [role.name for role in user.roles]
        permissions = set()
        for role in user.roles:
            for perm in role.permissions:
                permissions.add(perm.name)
                
        logger.info(f"Generated tokens for user {user.id} with roles: {roles} and permissions: {list(permissions)}")
        
        # Redirect to frontend with tokens in URL
        return redirect(
            f"{current_app.config['FRONTEND_URL']}/signin?code={user.id}"
            f"&state=success"
            f"&access_token={access_token}"
            f"&refresh_token={refresh_token}"
        )

    except Exception as e:
        current_app.logger.error(f"Google auth error: {str(e)}")
        return redirect(f"{current_app.config['FRONTEND_URL']}/signin?error=auth_failed")

@google_auth.route('/logout')
def logout():
    session.clear()
    return redirect(f"{current_app.config['FRONTEND_URL']}/signin")