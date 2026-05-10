import re
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List

# Simple email regex — avoids the need for the email-validator package
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

class UserRegister(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not EMAIL_REGEX.match(v):
            raise ValueError('Invalid email address')
        return v.lower().strip()

class UserLogin(BaseModel):
    email: str = Field(..., description="User email address")
    password: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not EMAIL_REGEX.match(v):
            raise ValueError('Invalid email address')
        return v.lower().strip()

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TelegramSettings(BaseModel):
    bot_token: str
    chat_id: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    telegram: Optional[str] = None
    phone: Optional[str] = None
    credit_balance: float
    class Config:
        from_attributes = True

class SettingsIn(BaseModel):
    full_name: Optional[str] = None
    telegram: Optional[str] = None
    phone: Optional[str] = None
    kie_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    business_category: Optional[str] = None
    business_name: Optional[str] = None
    business_description: Optional[str] = None
    business_region: Optional[str] = None
    target_audience: Optional[str] = None
    selling_platforms: Optional[str] = None

class SettingsOut(BaseModel):
    full_name: Optional[str] = None
    telegram: Optional[str] = None
    phone: Optional[str] = None
    kie_api_key_set: bool
    google_api_key_set: bool = False
    credit_balance: float
    business_category: Optional[str] = ""
    business_name: Optional[str] = ""
    business_description: Optional[str] = ""
    business_region: Optional[str] = ""
    target_audience: Optional[str] = ""
    selling_platforms: Optional[str] = ""

class GenerateVideoIn(BaseModel):
    prompt: str
    model: str = "kling-2.5-turbo"
    aspect_ratio: str = "9:16"
    resolution: str = "720p"
    num_videos: int = 1

class GenerateImageIn(BaseModel):
    prompt: str
    model: str = "flux-kontext-pro"
    aspect_ratio: str = "9:16"
    num_images: int = 1

class GenerateTextIn(BaseModel):
    system_prompt: str
    user_message: str
    model: str = "gpt-5.2"

class ContentCreate(BaseModel):
    type: str  # image, video, text, music, storyboard
    prompt: str
    model: Optional[str] = None
    aspect_ratio: Optional[str] = None
    status: Optional[str] = "processing"
    result_url: Optional[str] = None
    thumbnail_url: Optional[str] = None  # Poster/thumbnail URL separate from video URL
    kie_task_id: Optional[str] = None
    credit_cost: Optional[float] = 0.0

class ContentUpdate(BaseModel):
    status: Optional[str] = None
    result_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    kie_task_id: Optional[str] = None
    credit_cost: Optional[float] = None

class ContentOut(BaseModel):
    id: int
    type: str
    prompt: str
    model: Optional[str] = None
    aspect_ratio: Optional[str] = None
    status: str
    result_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    kie_task_id: Optional[str] = None
    credit_cost: Optional[float] = 0.0
    created_at: datetime
    class Config:
        from_attributes = True

class StatusCheckIn(BaseModel):
    task_ids: List[str]