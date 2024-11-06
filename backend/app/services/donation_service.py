from datetime import datetime
from app import db
from app.models import Donation, Payment, User, Project
from app.services.email_service import send_templated_email
from app.services.payment_service import PaymentService
from app.utils.redis_client import get_redis_client
from sqlalchemy.exc import IntegrityError
from typing import Optional, Dict
import logging
from app.models.enums import DonationStatus, PaymentStatus  # Ensure PaymentStatus is also imported if it's used
from app.utils.rate_limit import rate_limit
from app.utils.payment_helpers import get_payment_metadata

logger = logging.getLogger(__name__)

class DonationService:
    def __init__(self):
        self.payment_service = PaymentService()
        self._redis_client = None  # Lazy initialization

    @property
    def redis_client(self):
        if self._redis_client is None:
            self._redis_client = get_redis_client()
        return self._redis_client

    @rate_limit(limit=5, per=60)
    async def create_donation(self, user_id: int, project_id: int, amount: float, 
                              reward_id: Optional[int] = None, payment_method: Optional[str] = None,
                              currency: str = 'USD', recurring: bool = False, 
                              anonymous: bool = False, gift_aid: bool = False,
                              idempotency_key: Optional[str] = None, billing_details: Optional[dict] = None, 
                              return_url: Optional[str] = None, client_ip: Optional[str] = None, 
                              user_agent: Optional[str] = None) -> Optional[Donation]:
        """Create a new donation with associated payment"""
        try:
            # Step 1: Check Redis (Optional)
            if idempotency_key and self.redis_client.exists(idempotency_key):
                logger.info(f"Idempotency key {idempotency_key} already processed")
                existing_donation_id = self.redis_client.get(idempotency_key)
                return Donation.query.get(existing_donation_id)

            # Check for an existing donation with the same idempotency key
            existing_donation = Donation.query.filter_by(
                user_id=user_id,
                project_id=project_id,
                amount=amount,
                idempotency_key=idempotency_key
            ).first()

            if existing_donation:
                logger.info(f"Donation with idempotency key {idempotency_key} already exists")
                # Cache this result in Redis (Optional)
                if idempotency_key:
                    self.redis_client.setex(idempotency_key, 3600, existing_donation.id)  # Expires in 1 hour
                return existing_donation
            
            # Generate metadata for the payment
            payment_metadata = get_payment_metadata(
                idempotency_key=idempotency_key,
                billing_details=billing_details,
                payment_method=payment_method
            )

            # Step 3: Create the donation record
            donation = Donation(
                user_id=user_id,
                project_id=project_id,
                amount=amount,
                reward_id=reward_id,
                currency=currency,
                recurring=recurring,
                anonymous=anonymous,
                gift_aid=gift_aid,
                idempotency_key=idempotency_key,
                status=DonationStatus.PENDING,
                created_at=datetime.utcnow(),
            )

            db.session.add(donation)
            db.session.flush()  # Get donation ID without committing

            # Step 4: Pass metadata to payment service
            payment = await self.payment_service.create_payment(
                user_id=user_id,
                donation_id=donation.id,
                amount=amount,
                currency=currency,
                metadata=payment_metadata,  # Include the metadata here
                return_url=return_url,
                client_ip=client_ip,
                user_agent=user_agent
            )

            if payment:
                db.session.commit()  # Commit if payment creation succeeds
                if idempotency_key:
                    self.redis_client.setex(idempotency_key, 3600, donation.id)  # Cache in Redis (Optional)
                await self._send_donation_confirmation_email(donation)
                return donation
            else:
                db.session.rollback()
                logger.warning(f"Payment failed for Donation ID {donation.id}")
                return None

        except IntegrityError as e:
            db.session.rollback()
            logger.error(f"IntegrityError - likely a duplicate idempotency key: {e}")
            return None

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating donation: {e}")
            return None

    async def process_donation_payment(self, donation_id: int, payment_details: Dict) -> Optional[Payment]:
        """Process payment for a donation"""
        try:
            donation = Donation.query.get(donation_id)
            if not donation:
                raise ValueError("Donation not found")

            payment_result = await self.payment_service.process_payment(
                donation.payment.id, 
                payment_details
            )

            if payment_result.status == PaymentStatus.COMPLETED:
                donation.status = DonationStatus.COMPLETED
                db.session.commit()
                await self._send_donation_success_email(donation)
            elif payment_result.status == PaymentStatus.FAILED:
                donation.status = DonationStatus.FAILED
                db.session.commit()
                await self._send_donation_failed_email(donation)

            return payment_result

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error processing payment for Donation ID {donation_id}: {e}")
            raise e

    async def refund_donation(self, donation_id: int) -> bool:
        """Refund a donation"""
        try:
            donation = Donation.query.get(donation_id)
            if not donation:
                raise ValueError("Donation not found")

            refund_result = await self.payment_service.process_refund(donation.payment.id)
            
            if refund_result:
                donation.status = DonationStatus.REFUNDED
                db.session.commit()
                await self._send_donation_refund_email(donation)
                return True
            return False

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error refunding Donation ID {donation_id}: {e}")
            raise e

    async def _send_donation_confirmation_email(self, donation: Donation):
        """Send confirmation email for new donation"""
        user = User.query.get(donation.user_id)
        project = Project.query.get(donation.project_id)
        
        return await send_templated_email(
            to_email=user.email,
            email_type='donation_confirmation',
            donor_name=user.name,
            project_title=project.title,
            amount=donation.amount,
            donation_id=donation.id
        )

    async def _send_donation_success_email(self, donation: Donation):
        """Send success email after payment processed"""
        user = User.query.get(donation.user_id)
        project = Project.query.get(donation.project_id)
        
        return await send_templated_email(
            to_email=user.email,
            email_type='donation_success',
            donor_name=user.name,
            project_title=project.title,
            amount=donation.amount,
            donation_id=donation.id
        )

    async def _send_donation_failed_email(self, donation: Donation):
        """Send email when payment fails"""
        user = User.query.get(donation.user_id)
        
        return await send_templated_email(
            to_email=user.email,
            email_type='donation_failed',
            donor_name=user.name,
            amount=donation.amount,
            donation_id=donation.id
        )

    async def _send_donation_refund_email(self, donation: Donation):
        """Send email when donation is refunded"""
        user = User.query.get(donation.user_id)
        
        return await send_templated_email(
            to_email=user.email,
            email_type='donation_refund',
            donor_name=user.name,
            amount=donation.amount,
            donation_id=donation.id
        )
