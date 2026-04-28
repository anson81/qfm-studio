from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

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

class SettingsOut(BaseModel):
    full_name: Optional[str] = None
    telegram: Optional[str] = None
    phone: Optional[str] = None
    kie_api_key_set: bool
    credit_balance: float

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

class ContentOut(BaseModel):
    id: int
    type: str
    prompt: str
    model: Optional[str] = None
    aspect_ratio: Optional[str] = None
    status: str
    result_url: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class StatusCheckIn(BaseModel):
    task_ids: List[str]