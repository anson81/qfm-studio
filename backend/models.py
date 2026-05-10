from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
import config

engine = create_engine(
    config.DATABASE_URL,
    connect_args={"check_same_thread": False} if config.DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    telegram = Column(String)
    phone = Column(String)
    telegram_bot_token_encrypted = Column(String, default="")
    telegram_chat_id = Column(String, default="")
    kie_api_key_encrypted = Column(String, default="")
    business_category = Column(String, default="")  # e.g. "modest-fashion", "electronics", "food-beverage"
    business_name = Column(String, default="")  # e.g. "Queen Fashion Malaysia"
    business_description = Column(String, default="")  # e.g. "Muslim modest fashion brand selling on TikTok Shop and Shopee"
    business_region = Column(String, default="Malaysia")  # e.g. "Malaysia", "Indonesia", "Global"
    target_audience = Column(String, default="")  # e.g. "25-35 Muslim women"
    selling_platforms = Column(String, default="")  # e.g. "TikTok Shop,Shopee,Instagram"
    google_key_encrypted = Column(String, default="")  # Google AI Studio API key (encrypted)
    credit_balance = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    contents = relationship("Content", back_populates="user")
    schedules = relationship("Schedule", back_populates="user")

class Content(Base):
    __tablename__ = "content"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # image, video, text, storyboard
    prompt = Column(Text, nullable=False)
    model = Column(String)
    aspect_ratio = Column(String)
    status = Column(String, default="processing")  # processing, completed, failed
    result_url = Column(Text)
    thumbnail_url = Column(Text)  # Separate poster/thumbnail (for video previews)
    kie_task_id = Column(String)
    credit_cost = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="contents")

class Schedule(Base):
    __tablename__ = "schedules"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    platform = Column(String, default="tiktok")
    content = Column(Text)
    scheduled_at = Column(DateTime)
    repeat = Column(String)  # daily, weekly, none
    status = Column(String, default="draft")
    user = relationship("User", back_populates="schedules")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()