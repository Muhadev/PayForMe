# app/utils/email_service.py

import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from flask import current_app, render_template
import logging
from python_http_client.exceptions import HTTPError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from datetime import datetime

logger = logging.getLogger(__name__)

class EmailServiceError(Exception):
    """Custom exception for email service errors"""
    pass

def should_retry_exception(exception):
    """Determine if the exception should trigger a retry"""
    if isinstance(exception, HTTPError):
        # Retry on temporary SendGrid errors (5xx, 429)
        status_code = exception.status_code
        return status_code >= 500 or status_code == 429
    return True
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if_exception_type((HTTPError, ConnectionError)),
    reraise=True
)
def send_email(to_email: str, subject: str, text_content: str, html_content: str) -> bool:
    """Send an email using SendGrid with retry logic."""

    if not current_app.config.get('SENDGRID_API_KEY'):
        raise EmailServiceError("SendGrid API key not configured")

    message = Mail(
        from_email=current_app.config['SENDGRID_DEFAULT_FROM'],
        to_emails=to_email,
        subject=subject,
        plain_text_content=text_content,
        html_content=html_content)
    
    try:
        sg = SendGridAPIClient(current_app.config['SENDGRID_API_KEY'])
        response = sg.send(message)

        if response.status_code not in (200, 201, 202):
            raise EmailServiceError(f"Unexpected status code: {response.status_code}")
            
        logger.info(f"Email sent successfully to {to_email}. Status: {response.status_code}")
        return True
    except HTTPError as e:
        error_details = e.to_dict.get('errors', [{}])[0].get('message', str(e))
        logger.error(f"SendGrid HTTP error: {error_details}")
        raise EmailServiceError(f"Failed to send email: {error_details}")
    except Exception as e:
        logger.error(f"Unexpected error sending email: {str(e)}")
        raise EmailServiceError(f"Failed to send email: {str(e)}")

EMAIL_TEMPLATE_TYPES = [
    'verify_email', 'reset_password', '2fa_enabled', '2fa_disabled', 
    '2fa_setup', 'project_backed', 'project_update', 'project_milestone',
    'project_activated', 'reward_created', 'reward_updated', 'reward_claimed_backer',
    'reward_claimed_creator', 'project_revoked', 'project_featured', 'project_unfeatured', 'donation_confirmation',
    'donation_failed', 'donation_refund', 'donation_success',
    'payout_initiated', 'payout_completed', 'payout_failed'
]

def send_templated_email(to_email, email_type, **kwargs):
    """Send a templated email with enhanced error handling"""
    if not to_email:
        raise ValueError("No recipient email provided")
        
    if email_type not in EMAIL_TEMPLATE_TYPES:
        raise ValueError(f"Unknown email type: {email_type}")
    
    required_kwargs = get_required_template_kwargs(email_type)
    missing_kwargs = [k for k in required_kwargs if k not in kwargs]

    if missing_kwargs:
        raise ValueError(f"Missing required template variables: {missing_kwargs}")
        
    try:
        kwargs['current_year'] = datetime.now().year
        subject = get_email_subject(email_type)

        # Verify template existence before rendering
        template_path = f'email/{email_type}'
        if not current_app.jinja_env.get_template(f'{template_path}.html'):
            raise EmailServiceError(f"Email template not found: {template_path}.html")
            
        text_content = render_template(f'{template_path}.txt', **kwargs)
        html_content = render_template(f'{template_path}.html', **kwargs)
        
        return send_email(to_email, subject, text_content, html_content)

    except Exception as e:
        logger.error(f"Failed to send templated email: {str(e)}")
        raise EmailServiceError(f"Failed to send templated email: {str(e)}")

def get_required_template_kwargs(email_type):
    """Return required kwargs for each template type"""
    template_requirements = {
        'reward_updated': ['reward_title', 'project_title', 'changes'],
        'reward_created': ['project_title', 'reward_title', 'reward_description'],
        # 'project_revoked': ['project_title', 'creator_name'],
        # 'project_featured': ['project_title', 'creator_name'],
        # 'project_unfeatured': ['project_title', 'creator_name']
        'payout_initiated': ['user_name', 'project_title', 'amount', 'currency'],
        'payout_completed': ['user_name', 'project_title', 'amount', 'currency', 'payout_id'],
        'payout_failed': ['user_name', 'project_title', 'amount', 'currency', 'failure_reason'],
        # other template types...
    }
    return template_requirements.get(email_type, [])

def get_email_subject(email_type):
    subjects = {
        'verify_email': 'Verify Your Email',
        'reset_password': 'Reset Your Password',
        '2fa_enabled': 'Two-Factor Authentication Enabled',
        '2fa_disabled': 'Two-Factor Authentication Disabled',
        'project_backed': 'Thank You for Backing Our Project!',
        'project_update': 'New Update on Your Backed Project',
        'project_milestone': 'Project Milestone Reached!',
        'project_activated': 'Your Project Has Been Activated!',
        'project_revoked': 'Your Project Has Been Revoked',
        'project_featured': 'Your Project Has Been Featured!',
        'project_unfeatured': 'Your Project Has Been Removed from Featured',
        'reward_created': 'A New Reward Has Been Created!',
        'reward_updated': 'Reward Details Updated!',
        'reward_claimed_backer': 'You’ve Successfully Claimed Your Reward!',
        'reward_claimed_creator': 'A Backer Claimed Your Reward!',
        'donation_confirmation': 'Thank You for Your Donation!',
        'donation_success': 'Your Donation Was Successful',
        'donation_failed': 'Donation Payment Failed',
        'donation_refund': 'Your Donation Has Been Refunded',
        'payout_initiated': 'Your Payout Has Been Initiated',
        'payout_completed': 'Your Payout Has Been Completed',
        'payout_failed': 'Your Payout Has Failed'
    }
    return subjects.get(email_type, 'Notification from PayForMe')