from cryptography.fernet import Fernet, InvalidToken
import base64, hashlib, logging

logger = logging.getLogger(__name__)
_cipher = None

def get_cipher():
    global _cipher
    if _cipher is None:
        import config
        key = base64.urlsafe_b64encode(hashlib.sha256(config.CIPHER_KEY.encode()).digest())
        _cipher = Fernet(key)
    return _cipher

def encrypt_value(value: str) -> str:
    if not value:
        return ''
    return get_cipher().encrypt(value.encode('utf-8')).decode('utf-8')

def decrypt_value(encrypted: str) -> str:
    if not encrypted:
        return ''
    try:
        return get_cipher().decrypt(encrypted.encode('utf-8')).decode('utf-8')
    except InvalidToken:
        logger.error("Failed to decrypt value — CIPHER_KEY may have changed")
        raise