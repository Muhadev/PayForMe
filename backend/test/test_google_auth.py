import pytest
from flask import url_for
from unittest.mock import patch, MagicMock

from backend.app import create_app, db
from backend.app.models.user import User

@pytest.fixture(scope='module')
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='module')
def client(app):
    return app.test_client()

@pytest.fixture(scope='module')
def runner(app):
    return app.test_cli_runner()

def test_google_login_redirect(client, app):
    with patch('backend.app.routes.google_auth.init_oauth') as mock_init_oauth:
        mock_oauth = MagicMock()
        mock_init_oauth.return_value = mock_oauth
        mock_oauth.authorize_redirect.return_value = "mock_redirect"
        
        with app.test_request_context():
            response = client.get(url_for('google_auth.login'))
        
        mock_oauth.authorize_redirect.assert_called_once_with(url_for('google_auth.authorized', _external=True))
        assert response == "mock_redirect"

def test_google_authorized_new_user(client, app):
    with patch('backend.app.routes.google_auth.init_oauth'), \
         patch('backend.app.routes.google_auth.google.parse_id_token') as mock_parse_id_token, \
         patch('backend.app.routes.google_auth.google.authorize_access_token') as mock_authorize_access_token:
        
        mock_authorize_access_token.return_value = {'access_token': 'mock_access_token'}
        mock_parse_id_token.return_value = {'email': 'test@example.com', 'name': 'Test User'}
        
        with app.test_request_context():
            response = client.get(url_for('google_auth.authorized'))
        
        data = response.get_json()
        assert response.status_code == 200
        assert data['email'] == 'test@example.com'
        assert data['name'] == 'Test User'
        assert data['token'] == 'mock_access_token'
        
        with app.app_context():
            user = User.query.filter_by(email='test@example.com').first()
            assert user is not None
            assert user.name == 'Test User'

def test_google_authorized_existing_user(client, app):
    with app.app_context():
        existing_user = User(email='test@example.com', name='Existing User')
        db.session.add(existing_user)
        db.session.commit()

    with patch('backend.app.routes.google_auth.init_oauth'), \
         patch('backend.app.routes.google_auth.google.parse_id_token') as mock_parse_id_token, \
         patch('backend.app.routes.google_auth.google.authorize_access_token') as mock_authorize_access_token:
        
        mock_authorize_access_token.return_value = {'access_token': 'mock_access_token'}
        mock_parse_id_token.return_value = {'email': 'test@example.com', 'name': 'Existing User'}
        
        with app.test_request_context():
            response = client.get(url_for('google_auth.authorized'))
        
        data = response.get_json()
        assert response.status_code == 200
        assert data['email'] == 'test@example.com'
        assert data['name'] == 'Existing User'
        assert data['token'] == 'mock_access_token'
        
        with app.app_context():
            user = User.query.filter_by(email='test@example.com').first()
            assert user is not None
            assert user.name == 'Existing User'
