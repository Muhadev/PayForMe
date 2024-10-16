# app/utils/email_service.py

import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from flask import current_app, render_template
import logging
from python_http_client.exceptions import HTTPError

logger = logging.getLogger(__name__)

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
    'project_activated'
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
        'project_activated': 'Your Project Has Been Activated!'
    }
    return subjects.get(email_type, 'Notification from PayForMe')