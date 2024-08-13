from flask import Blueprint, redirect, url_for, session, request, jsonify, current_app
from authlib.integrations.flask_client import OAuth
from app import db
from app.models.user import User

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
    redirect_uri = url_for('google_auth.authorized', _external=True)
    return google.authorize_redirect(redirect_uri)

@google_auth.route('/login/google/authorized')
def authorized():
    token = google.authorize_access_token()
    if token is None:
        return jsonify({
            'error': 'Access denied',
            'error_reason': request.args.get('error_reason'),
            'error_description': request.args.get('error_description')
        }), 400

    # Fetch user information
    user_info = google.parse_id_token(token)
    if not user_info:
        return jsonify({'error': 'Failed to fetch user info.'}), 500

    # Check if the user exists in the database
    user = User.query.filter_by(email=user_info['email']).first()
    if user is None:
        user = User(email=user_info['email'], name=user_info['name'])
        db.session.add(user)
        db.session.commit()

    # Send user info or token to React frontend
    return jsonify({
        'email': user_info['email'],
        'name': user_info['name'],
        'token': token['access_token']  # Optional: Only if you need to send the token
    })
