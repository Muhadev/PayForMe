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
        if not is_draft and not description:
            raise ValidationError("Description is required")
        if description and len(description) > ProjectLimits.DESCRIPTION_MAX_LENGTH:
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
    def validate_dates(start_date: str, end_date: str, is_draft: bool) -> None:
        if not is_draft:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                today = date.today()

                if start_date >= end_date:
                    raise ValidationError("End date must be after start date")
                if start_date < today:
                    raise ValidationError("Start date cannot be in the past")
            except ValueError:
                raise ValidationError("Invalid date format. Use YYYY-MM-DD")

    @staticmethod
    def validate_category(category_id: Any, is_draft: bool) -> None:
        if not is_draft and not category_id:
            raise ValidationError("Category is required")

    @staticmethod
    def validate_featured(featured: Any) -> None:
        if featured is not None and not isinstance(featured, bool):
            raise ValidationError("Featured must be a boolean value")

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

        if not is_draft and status_value == ProjectStatus.DRAFT:
            raise ValidationError("Non-draft projects cannot have 'DRAFT' status")

        # if status_value not in ProjectStatus.__members__.values():
        #     raise ValidationError(f"Invalid status. Must be one of: {', '.join([s.value for s in ProjectStatus])}")

    @staticmethod
    def validate_video_url(video_url: str) -> None:
        if video_url and not validators.url(video_url):
            raise ValidationError("Invalid video URL")

    @staticmethod
    def validate_image_url(image_url: str) -> None:
        if image_url and not validators.url(image_url):
            raise ValidationError("Invalid image URL")

def validate_project_data(data: Dict[str, Any], is_draft: bool = False) -> Dict[str, Any]:
    required_fields = ['title', 'description', 'goal_amount', 'start_date', 'end_date', 'category_id']

    # Handle status
    status = data.get('status', ProjectStatus.DRAFT)
    if isinstance(status, str):
        try:
            status = ProjectStatus.from_string(status)
        except ValueError as e:
            raise ValidationError(str(e))
    elif not isinstance(status, ProjectStatus):
        raise ValidationError("Invalid status type")
    
    data['status'] = status  # Update the status in the data dictionary


    if not is_draft:
        for field in required_fields:
            if field not in data or not data[field]:
                raise ValidationError(f"{field.replace('_', ' ').capitalize()} is required")

    ProjectValidator.validate_title(data.get('title', ''))
    ProjectValidator.validate_description(data.get('description', ''), is_draft)
    
    if not is_draft:
        ProjectValidator.validate_goal_amount(data.get('goal_amount'), is_draft)
        ProjectValidator.validate_dates(data.get('start_date', ''), data.get('end_date', ''), is_draft)

    ProjectValidator.validate_category(data.get('category_id'), is_draft)
    ProjectValidator.validate_featured(data.get('featured'))
    ProjectValidator.validate_risk_and_challenges(data.get('risk_and_challenges', ''))
    ProjectValidator.validate_status(status, is_draft)
    
    ProjectValidator.validate_video_url(data.get('video_url', ''))
    ProjectValidator.validate_image_url(data.get('image_url', ''))

    return data

    # File validation and upload
    if 'video_file' in data:
        data['video_url'] = handle_file_upload(
            data['video_file'],
            data['allowed_video_extensions'],
            data['upload_folder'],
            is_draft
        )

    if 'image_file' in data:
        data['image_url'] = handle_file_upload(
            data['image_file'],
            data['allowed_image_extensions'],
            data['upload_folder'],
            is_draft
        )
