from flask import Blueprint, redirect, url_for, session, request
from flask_oauthlib.client import OAuth
from flask import current_app
from app import db
from .models.user import User

oauth = OAuth(app)

google = oauth.remote_app(
    'google',
    consumer_key=current_app.config['GOOGLE_CLIENT_ID'],
    consumer_secret=current_app.config['GOOGLE_CLIENT_SECRET'],
    request_token_params={
        'scope': 'email'
    },
    base_url='https://www.googleapis.com/oauth2/v1/',
    request_token_url=None,
    access_token_method='POST',
    access_token_url='https://accounts.google.com/o/oauth2/token',
    authorize_url='https://accounts.google.com/o/oauth2/auth',
)

google_auth = Blueprint('google_auth', __name__)

@google_auth.route('/login/google')
def login():
    return google.authorize(callback=url_for('google_auth.authorized', _external=True))

@google_auth.route('/login/google/authorized')
def authorized():
    response = google.authorized_response()
    if response is None or response.get('access_token') is None:
        return 'Access denied: reason={} error={}'.format(
            request.args['error_reason'],
            request.args['error_description']
        )
    session['google_token'] = (response['access_token'], '')
    user_info = google.get('userinfo')
    user = User.query.filter_by(email=user_info.data['email']).first()
    if user is None:
        user = User(email=user_info.data['email'], name=user_info.data['name'])
        db.session.add(user)
        db.session.commit()
    return redirect(url_for('main.index'))

@google.tokengetter
def get_google_oauth_token():
    return session.get('google_token')
