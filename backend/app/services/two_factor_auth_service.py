# app/services/two_factor_auth_service.py

import pyotp
import qrcode
import io
import base64
from app.models.user import User
from app import db
from app.services.email_service import send_templated_email
import secrets

class TwoFactorAuthService:
    @staticmethod
    def initiate_2fa_setup(user):
        if user.two_factor_secret:
            return False, "2FA is already set up for this user"

        verification_code = secrets.token_hex(3)  # 6-character hex code
        
        user.two_factor_setup_code = verification_code
        db.session.commit()

        if send_templated_email(user.email, '2fa_setup', user=user, verification_code=verification_code):
            return True, "Verification code sent to your email"
        else:
            return False, "Failed to send verification code"

    @staticmethod
    def complete_2fa_setup(user, verification_code):
        if user.two_factor_setup_code != verification_code:
            return None, "Invalid verification code"

        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(name=user.email, issuer_name="PayForMe")

        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()

        user.two_factor_secret = secret
        user.two_factor_setup_code = None  # Clear the setup code
        db.session.commit()

        if send_templated_email(user.email, '2fa_enabled', user=user):
            return {"qr_code": img_str, "secret": secret}, "2FA setup successful"
        else:
            return {"qr_code": img_str, "secret": secret}, "2FA setup successful, but failed to send confirmation email"

    @staticmethod
    def verify_2fa(user, code):
        if not user.two_factor_secret:
            return False, "2FA is not set up for this user"

        totp = pyotp.TOTP(user.two_factor_secret)
        if totp.verify(code):
            user.two_factor_enabled = True
            db.session.commit()
            return True, "2FA verified successfully"
        else:
            return False, "Invalid 2FA code"

    @staticmethod
    def revoke_2fa(user):
        if not user.two_factor_secret:
            return False, "2FA is not set up for this user"

        user.two_factor_secret = None
        user.two_factor_enabled = False
        db.session.commit()

        if send_templated_email(user.email, '2fa_disabled', user=user):
            return True, "2FA has been revoked"
        else:
            return False, "2FA revoked, but failed to send notification email"