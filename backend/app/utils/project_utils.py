# app/utils/project_utils.py

from dataclasses import dataclass
from decimal import Decimal
from typing import List, Dict, Any, Optional
from datetime import datetime
import validators
from app.utils.exceptions import ValidationError
from .file_utils import handle_file_upload
from app.models.project import ProjectStatus

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
                start_date = datetime.strptime(start_date, '%Y-%m-%d')
                end_date = datetime.strptime(end_date, '%Y-%m-%d')
                if start_date >= end_date:
                    raise ValidationError("End date must be after start date")
                if start_date < datetime.now().date():
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
    def validate_status(status: str) -> None:
        try:
            ProjectStatus(status)
        except ValueError:
            raise ValidationError(f"Invalid status. Must be one of: {', '.join([s.value for s in ProjectStatus])}")

    @staticmethod
    def validate_video_url(video_url: str) -> None:
        if video_url and not validators.url(video_url):
            raise ValidationError("Invalid video URL")

    @staticmethod
    def validate_image_url(image_url: str) -> None:
        if image_url and not validators.url(image_url):
            raise ValidationError("Invalid image URL")

def validate_project_data(data: Dict[str, Any], is_draft: bool = False) -> None:
    required_fields = ['title', 'description', 'goal_amount', 'start_date', 'end_date', 'category_id']
    
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
    ProjectValidator.validate_status(data.get('status', ''))
    ProjectValidator.validate_video_url(data.get('video_url', ''))
    ProjectValidator.validate_image_url(data.get('image_url', ''))

    # File validation and upload
    if 'video_file' in data:
        data['video_url'] = handle_file_upload(
            data['video_file'],
            current_app.config['ALLOWED_VIDEO_EXTENSIONS'],
            current_app.config['UPLOAD_FOLDER'],
            is_draft
        )

    if 'image_file' in data:
        data['image_url'] = handle_file_upload(
            data['image_file'],
            current_app.config['ALLOWED_EXTENSIONS'],
            current_app.config['UPLOAD_FOLDER'],
            is_draft
        )