from flask import Blueprint, redirect, url_for, session, request, current_app
from authlib.integrations.flask_client import OAuth
from app import db
from app.models.user import User
from app.utils.response import success_response, error_response
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
    current_app.logger.info("Entered authorized route")
    if request.args.get('state') != session.pop('oauth_state', None):
        current_app.logger.error("Invalid state parameter")
        return error_response("Invalid state parameter", status_code=403)

    try:
        current_app.logger.info("Attempting to authorize access token")
        token = google.authorize_access_token()
        current_app.logger.info(f"Token received: {token}")
    except Exception as e:
        current_app.logger.error(f"Failed to authorize access token: {str(e)}")
        return error_response(f"Authorization failed: {str(e)}", status_code=500)

    try:
        current_app.logger.info("Fetching user info")
        resp = google.get('https://www.googleapis.com/oauth2/v3/userinfo')
        user_info = resp.json()
        current_app.logger.info(f"User info received: {user_info}")
    except Exception as e:
        current_app.logger.error(f"Failed to fetch user info: {str(e)}")
        return error_response(f"Failed to fetch user info: {str(e)}", status_code=500)

    user = User.query.filter_by(email=user_info['email']).first()
    if user is None:
        user = User(email=user_info['email'], name=user_info.get('name', ''))
        db.session.add(user)
    else:
        user.full_name = user_info.get('name', user.full_name)
    
    db.session.commit()

    session['user_id'] = user.id

    return success_response(
        data={
            'email': user_info['email'],
            'name': user_info.get('name', '')
        },
        message="Successfully authenticated with Google"
    )

@google_auth.route('/logout')
def logout():
    session.clear()
    return success_response(message="Logged out successfully")