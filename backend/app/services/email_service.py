import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from flask import current_app, render_template
import logging
from python_http_client.exceptions import HTTPError

# Configure logging
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
        current_app.logger.info(f"Email sent. Status Code: {response.status_code}")
        return True
    except Exception as e:
        if isinstance(e, HTTPError):
            current_app.logger.error(f"SendGrid API error: {str(e)}")
        else:
            current_app.logger.error(f"Unexpected error sending email: {str(e)}")
        return False

EMAIL_TEMPLATE_TYPES = ['verification', 'reset_password']

def send_templated_email(to_email, email_type, user):
    if email_type not in EMAIL_TEMPLATE_TYPES:
        current_app.logger.error(f"Unknown email type: {email_type}")
        return False
    
    if email_type == 'verification':
        token = user.get_verification_token()
        subject = 'Verify Your Email'
        text_content = render_template('email/verify_email.txt', user=user, token=token)
        html_content = render_template('email/verify_email.html', user=user, token=token)
    
    elif email_type == 'reset_password':
        token = user.get_reset_password_token()
        subject = 'Reset Your Password'
        text_content = render_template('email/reset_password.txt', user=user, token=token)
        html_content = render_template('email/reset_password.html', user=user, token=token)
    
    return send_email(to_email, subject, text_content, html_content)
