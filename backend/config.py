import os, secrets
from dotenv import load_dotenv

load_dotenv()

APP_NAME = "QFM Studio API"
VERSION = "1.0.0"
SECRET_KEY = os.environ.get("SECRET_KEY", secrets.token_urlsafe(32))
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./qfm.db")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24 * 7))
KIE_BASE_URL = os.environ.get("KIE_BASE_URL", "https://api.kie.ai")
CIPHER_KEY = os.environ.get("CIPHER_KEY", secrets.token_urlsafe(32))
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:8000,https://anson81.github.io").split(",")