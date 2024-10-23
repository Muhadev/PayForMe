# app/utils/email_service.py

import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from flask import current_app, render_template
import logging
from python_http_client.exceptions import HTTPError
from tenacity import retry, stop_after_attempt, wait_exponential


logger = logging.getLogger(__name__)

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
def send_email(to_email, subject, text_content, html_content):
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
    if email_type not in EMAIL_TEMPLATE_TYPES:
        logger.error(f"Unknown email type: {email_type}")
        return False
    
    try:
        subject = get_email_subject(email_type)
        text_content = render_template(f'email/{email_type}.txt', **kwargs)
        html_content = render_template(f'email/{email_type}.html', **kwargs)
    except Exception as e:
        logger.error(f"Error rendering email template: {str(e)}")
        return False
    
    return send_email(to_email, subject, text_content, html_content)

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
    }
    return subjects.get(email_type, 'Notification from PayForMe')