from datetime import datetime
from app import db
from app.models import Donation, Payment, User, Project
from app.utils.email_service import send_templated_email
from app.services.payment_service import PaymentService
from app.utils.redis_client import RedisClient
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)

class DonationService:
    def __init__(self):
        self.payment_service = PaymentService()
        self.cache = RedisClient()

    async def create_donation(self, user_id: int, project_id: int, amount: float, 
                              reward_id: Optional[int] = None, payment_method: Optional[str] = None,
                              currency: str = 'USD') -> Optional[Donation]:
        """Create a new donation with associated payment"""
        try:
            donation = Donation(
                user_id=user_id,
                project_id=project_id,
                amount=amount,
                reward_id=reward_id,
                created_at=datetime.utcnow(),
                status=DonationStatus.PENDING
            )
            db.session.add(donation)
            db.session.flush()  # Get donation ID without committing

            payment = await self.payment_service.create_payment(
                user_id=user_id,
                donation_id=donation.id,
                amount=amount,
                currency=currency,
                payment_method=payment_method
            )

            if payment:
                db.session.commit()
                await self._send_donation_confirmation_email(donation)
                return donation
            else:
                db.session.rollback()
                logger.warning(f"Payment failed for Donation ID {donation.id}")
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
