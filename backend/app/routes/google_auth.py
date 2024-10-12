from flask import Blueprint, redirect, url_for, session, request, current_app
from authlib.integrations.flask_client import OAuth
from app import db
from app.models.user import User
from app.utils.response import success_response, error_response
import os
import secrets

google_auth = Blueprint('google_auth', __name__)

def init_oauth(app):
    oauth = OAuth(app)
    google = oauth.register(
        name='google',
        client_id=app.config['GOOGLE_CLIENT_ID'],
        client_secret=app.config['GOOGLE_CLIENT_SECRET'],
        access_token_url='https://accounts.google.com/o/oauth2/token',
        access_token_params=None,
        authorize_url='https://accounts.google.com/o/oauth2/auth',
        authorize_params=None,
        client_kwargs={'scope': 'openid profile email'},
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
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
    if request.args.get('state') != session.pop('oauth_state', None):
        return error_response("Invalid state parameter", status_code=403)

    try:
        token = google.authorize_access_token()
    except Exception as e:
        current_app.logger.error(f"Failed to authorize access token: {str(e)}")
        return error_response("Authorization failed", status_code=500)

    if token is None:
        return error_response(
            "Access denied",
            status_code=400,
            meta={
                'error_reason': request.args.get('error_reason'),
                'error_description': request.args.get('error_description')
            }
        )

    try:
        user_info = google.parse_id_token(token)
    except Exception as e:
        current_app.logger.error(f"Failed to parse ID token: {str(e)}")
        return error_response("Failed to fetch user info", status_code=500)

    if not user_info:
        return error_response("Failed to fetch user info", status_code=500)

    user = User.query.filter_by(email=user_info['email']).first()
    if user is None:
        user = User(email=user_info['email'], name=user_info['name'])
        db.session.add(user)
    else:
        user.name = user_info['name']
    
    db.session.commit()

    session['user_id'] = user.id

    return success_response(
        data={
            'email': user_info['email'],
            'name': user_info['name']
        },
        message="Successfully authenticated with Google"
    )

@google_auth.route('/logout')
def logout():
    session.clear()
    return success_response(message="Logged out successfully")