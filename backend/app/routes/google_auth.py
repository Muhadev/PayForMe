# backend/app/routes/google_auth.py

from flask import Blueprint, redirect, url_for, session, request, current_app
from authlib.integrations.flask_client import OAuth
from app import db
from app.models.user import User
from app.utils.response import success_response, error_response
from flask_jwt_extended import create_access_token, create_refresh_token
import secrets

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
        if request.args.get('state') != session.pop('oauth_state', None):
            return redirect(f"{current_app.config['FRONTEND_URL']}/signin?error=invalid_state")

        token = google.authorize_access_token()
        resp = google.get('https://www.googleapis.com/oauth2/v3/userinfo')
        user_info = resp.json()

        user = User.query.filter_by(email=user_info['email']).first()
        if user is None:
            user = User(email=user_info['email'], name=user_info.get('name', ''))
            db.session.add(user)
        else:
            user.full_name = user_info.get('name', user.full_name)
        
        db.session.commit()

        # Create tokens
        token_identity = {
            'id': user.id,
            'email': user.email,
            'roles': [role.name for role in user.roles] if hasattr(user, 'roles') else []
        }
        
        access_token = create_access_token(identity=token_identity)
        refresh_token = create_refresh_token(identity=token_identity)

        # Redirect to frontend with tokens in URL parameters
        redirect_url = f"{current_app.config['FRONTEND_URL']}/auth/callback?access_token={access_token}&refresh_token={refresh_token}"
        return redirect(redirect_url)

    except Exception as e:
        current_app.logger.error(f"Google auth error: {str(e)}")
        return redirect(f"{current_app.config['FRONTEND_URL']}/signin?error=auth_failed")

@google_auth.route('/logout')
def logout():
    session.clear()
    return redirect(f"{current_app.config['FRONTEND_URL']}/signin")