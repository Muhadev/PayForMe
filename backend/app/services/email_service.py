import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from flask import current_app, render_template
import logging
from python_http_client.exceptions import HTTPError

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

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
        # Check if response has a body, and log it if available
        if response.body:
            current_app.logger.info(f"SendGrid Response: {response.body.decode('utf-8')}")
        return True
    except HTTPError as e:
        current_app.logger.error(f"SendGrid HTTP error: {str(e)}")
    except Exception as e:
        current_app.logger.error(f"Unexpected error sending email: {str(e)}")
    return False

EMAIL_TEMPLATE_TYPES = ['verification', 'reset_password']

def send_templated_email(to_email, email_type, user, reset_link=None):
    if email_type not in EMAIL_TEMPLATE_TYPES:
        current_app.logger.error(f"Unknown email type: {email_type}")
        return False
    
    if email_type == 'verification':
        token = user.generate_verification_token()
        subject = 'Verify Your Email'
        text_content = render_template('email/verify_email.txt', user=user, token=token)
        html_content = render_template('email/verify_email.html', user=user, token=token)
    
    elif email_type == 'reset_password':
        if not reset_link:
            current_app.logger.error("Reset link is missing for password reset email.")
            return False

        subject = 'Reset Your Password'
        text_content = render_template('email/reset_password.txt', user=user, reset_link=reset_link)
        html_content = render_template('email/reset_password.html', user=user, reset_link=reset_link)
    
    return send_email(to_email, subject, text_content, html_content)
