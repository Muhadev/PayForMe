# app/utils/email_service.py

import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from flask import current_app, render_template
import logging
from python_http_client.exceptions import HTTPError
from tenacity import retry, stop_after_attempt, wait_exponential
from datetime import datetime

logger = logging.getLogger(__name__)

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
async def send_email(to_email: str, subject: str, text_content: str, html_content: str) -> bool:
    """Send an email using SendGrid with retry logic."""
    message = Mail(
        from_email=current_app.config['SENDGRID_DEFAULT_FROM'],
        to_emails=to_email,
        subject=subject,
        plain_text_content=text_content,
        html_content=html_content)
    
    try:
        sg = SendGridAPIClient(current_app.config['SENDGRID_API_KEY'])
        response = sg.send(message)
        logger.info(f"Email sent to {to_email}. Status Code: {response.status_code}")
        if response.body:
            logger.debug(f"SendGrid Response: {response.body.decode('utf-8')}")
        return True
    except HTTPError as e:
        logger.error(f"SendGrid HTTP error: {e.to_dict}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending email: {str(e)}")
        return False

EMAIL_TEMPLATE_TYPES = [
    'verification', 'reset_password', '2fa_enabled', '2fa_disabled', 
    '2fa_setup', 'project_backed', 'project_update', 'project_milestone',
    'project_activated', 'reward_created', 'reward_updated', 'reward_claimed_backer',
    'reward_claimed_creator'
]

def send_templated_email(to_email, email_type, **kwargs):
    if not to_email:
        logger.error("No recipient email provided")
        return False
        
    if email_type not in EMAIL_TEMPLATE_TYPES:
        logger.error(f"Unknown email type: {email_type}")
        return False
    
    required_kwargs = get_required_template_kwargs(email_type)
    missing_kwargs = [k for k in required_kwargs if k not in kwargs]
    if missing_kwargs:
        logger.error(f"Missing required template variables: {missing_kwargs}")
        return False
    try:
        kwargs['current_year'] = datetime.now().year
        subject = get_email_subject(email_type)
        text_content = render_template(f'email/{email_type}.txt', **kwargs)
        html_content = render_template(f'email/{email_type}.html', **kwargs)
    except Exception as e:
        logger.error(f"Error rendering email template: {str(e)}")
        return False
    
    return send_email(to_email, subject, text_content, html_content)

def get_required_template_kwargs(email_type):
    """Return required kwargs for each template type"""
    template_requirements = {
        'reward_updated': ['reward_title', 'project_title', 'changes'],
        'reward_created': ['project_title', 'reward_title', 'reward_description'],
    }
    return template_requirements.get(email_type, [])

def get_email_subject(email_type):
    subjects = {
        'verification': 'Verify Your Email',
        'reset_password': 'Reset Your Password',
        '2fa_enabled': 'Two-Factor Authentication Enabled',
        '2fa_disabled': 'Two-Factor Authentication Disabled',
        'project_backed': 'Thank You for Backing Our Project!',
        'project_update': 'New Update on Your Backed Project',
        'project_milestone': 'Project Milestone Reached!',
        'project_activated': 'Your Project Has Been Activated!',
        'reward_created': 'A New Reward Has Been Created!',
        'reward_updated': 'Reward Details Updated!',
        'reward_claimed_backer': 'You’ve Successfully Claimed Your Reward!',
        'reward_claimed_creator': 'A Backer Claimed Your Reward!',
        # 'donation_confirmation': 'Thank You for Your Donation!',
        # 'donation_success': 'Your Donation Was Successful',
        # 'donation_failed': 'Donation Payment Failed',
        # 'donation_refund': 'Your Donation Has Been Refunded'
    }
    return subjects.get(email_type, 'Notification from PayForMe')