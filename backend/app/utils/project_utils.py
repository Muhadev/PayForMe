# app/utils/project_utils.py

from dataclasses import dataclass
from decimal import Decimal
from typing import List, Dict, Any, Optional
from datetime import datetime, date
import validators
from app.utils.exceptions import ValidationError
from .file_utils import handle_file_upload
from app.models.enums import ProjectStatus
import logging

# Initialize logger for the utils module
logger = logging.getLogger(__name__)

@dataclass
class ProjectLimits:
    TITLE_MAX_LENGTH: int = 100
    DESCRIPTION_MAX_LENGTH: int = 5000
    RISK_AND_CHALLENGES_MAX_LENGTH: int = 1000

class ProjectValidator:
    @staticmethod
    def validate_title(title: str) -> None:
        if not title:
            raise ValidationError("Title is required")
        if len(title) > ProjectLimits.TITLE_MAX_LENGTH:
            raise ValidationError(f"Title must be {ProjectLimits.TITLE_MAX_LENGTH} characters or less")

    @staticmethod
    def validate_description(description: str, is_draft: bool) -> None:
        # Remove the requirement check for drafts
        if not description:
            if not is_draft:
                raise ValidationError("Description is required")
            return  # Allow empty description for drafts
            
        if len(description) > ProjectLimits.DESCRIPTION_MAX_LENGTH:
            raise ValidationError(f"Description must be {ProjectLimits.DESCRIPTION_MAX_LENGTH} characters or less")

    @staticmethod
    def validate_goal_amount(goal_amount: Any, is_draft: bool) -> None:
        if not is_draft:
            try:
                goal_amount = Decimal(goal_amount)
                if goal_amount <= 0:
                    raise ValidationError("Goal amount must be greater than 0")
            except (TypeError, ValueError):
                raise ValidationError("Invalid goal amount")

    @staticmethod
    def validate_end_date(end_date: str, is_draft: bool) -> None:
        if not is_draft:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                today = date.today()

                if end_date <= today:
                    raise ValidationError("End date must be in the future")
            except ValueError:
                raise ValidationError("Invalid date format for end date. Use YYYY-MM-DD")

    @staticmethod
    def validate_start_date(start_date: str, end_date: str, is_draft: bool) -> None:
        if not is_draft and start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                today = date.today()

                if start_date < today:
                    raise ValidationError("Start date cannot be in the past")
                if start_date >= end_date:
                    raise ValidationError("Start date must be before end date")
            except ValueError:
                raise ValidationError("Invalid date format. Use YYYY-MM-DD")

    @staticmethod
    def validate_category(category_id: Any, is_draft: bool) -> None:
        if not is_draft and not category_id:
            raise ValidationError("Category is required")

    @staticmethod
    def validate_featured(featured: Any) -> None:
        if featured is not None:
            if isinstance(featured, str):
                # Convert string to boolean
                if featured.lower() == 'true':
                    return True
                elif featured.lower() == 'false':
                    return False
                else:
                    raise ValidationError("Featured must be a boolean value or 'true'/'false' string")
            elif not isinstance(featured, bool):
                raise ValidationError("Featured must be a boolean value")
        return False

    @staticmethod
    def validate_risk_and_challenges(risk_and_challenges: str) -> None:
        if risk_and_challenges and len(risk_and_challenges) > ProjectLimits.RISK_AND_CHALLENGES_MAX_LENGTH:
            raise ValidationError(f"Risk and challenges description must be {ProjectLimits.RISK_AND_CHALLENGES_MAX_LENGTH} characters or less")

    @staticmethod
    def validate_status(status: Any, is_draft: bool = False) -> None:
        logger.debug(f"Validating status: {status} (is_draft: {is_draft})")

        if isinstance(status, ProjectStatus):
            status_value = status
        elif isinstance(status, str):
            try:
                status_value = ProjectStatus.from_string(status)
            except ValueError as e:
                raise ValidationError(str(e))
        else:
            raise ValidationError("Status must be a string or a ProjectStatus enum")

        if is_draft and status_value != ProjectStatus.DRAFT:
            raise ValidationError("Draft projects must have 'DRAFT' status")

        if not is_draft and status_value not in [ProjectStatus.ACTIVE, ProjectStatus.PENDING]:
            raise ValidationError("Non-draft projects cannot have 'DRAFT' status")

        if status_value not in ProjectStatus.__members__.values():
            raise ValidationError(f"Invalid status. Must be one of: {', '.join([s.value for s in ProjectStatus])}")

    @staticmethod
    def validate_video_url(video_url: str) -> None:
        if video_url and not (validators.url(video_url) or video_url.startswith('/uploads/')):
            raise ValidationError("Invalid video URL")

    @staticmethod
    def validate_image_url(image_url: str) -> None:
        if image_url and not (validators.url(image_url) or image_url.startswith('/uploads/')):
            raise ValidationError("Invalid image URL")

def validate_project_data(data: Dict[str, Any], is_draft: bool = False) -> Dict[str, Any]:
    logger.info(f"Validating project data (is_draft: {is_draft})")
    
    # For drafts, only title is required
    if is_draft:
        if not data.get('title'):
            raise ValidationError("Title is required even for drafts")
        
        # Set status to DRAFT
        data['status'] = ProjectStatus.DRAFT
        
        # Validate optional fields if they exist
        if 'description' in data:
            ProjectValidator.validate_description(data['description'], is_draft=True)
        if 'goal_amount' in data:
            ProjectValidator.validate_goal_amount(data.get('goal_amount'), is_draft=True)
        if 'category_id' in data:
            ProjectValidator.validate_category(data.get('category_id'), is_draft=True)
        if 'end_date' in data and 'start_date' in data:
            ProjectValidator.validate_end_date(data.get('end_date'), is_draft=True)
            ProjectValidator.validate_start_date(data.get('start_date'), data.get('end_date'), is_draft=True)
    else:
        # For non-drafts, validate all required fields
        required_fields = ['title', 'description', 'goal_amount', 'end_date', 'category_id']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")
            
        # Validate all fields
        ProjectValidator.validate_title(data['title'])
        ProjectValidator.validate_description(data['description'], is_draft=False)
        ProjectValidator.validate_goal_amount(data['goal_amount'], is_draft=False)
        ProjectValidator.validate_end_date(data['end_date'], is_draft=False)
        ProjectValidator.validate_category(data['category_id'], is_draft=False)
        
        if 'start_date' in data:
            ProjectValidator.validate_start_date(data['start_date'], data['end_date'], is_draft=False)

    # Handle optional fields for both drafts and non-drafts
    if 'featured' in data:
        data['featured'] = ProjectValidator.validate_featured(data['featured'])
    if 'risk_and_challenges' in data:
        ProjectValidator.validate_risk_and_challenges(data['risk_and_challenges'])
    if 'video_url' in data:
        ProjectValidator.validate_video_url(data['video_url'])
    if 'image_url' in data:
        ProjectValidator.validate_image_url(data['image_url'])

    return data