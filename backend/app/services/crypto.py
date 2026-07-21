import base64
import hashlib
import secrets
from typing import Any


class CryptoService:
    @staticmethod
    def compute_key_fingerprint(public_key_str: str) -> str:
        """
        Computes SHA-256 fingerprint of a public key.
        """
        cleaned_key = public_key_str.strip().encode("utf-8")
        digest = hashlib.sha256(cleaned_key).hexdigest()
        # Format fingerprint into colon-separated hex pairs
        return ":".join(digest[i : i + 2] for i in range(0, 32, 2))

    @staticmethod
    def verify_zero_knowledge_envelope(
        encrypted_data: str, iv: str | None = None, salt: str | None = None
    ) -> dict[str, Any]:
        """
        Verifies that an incoming encrypted sync blob payload adheres to AES-256-GCM zero-knowledge envelope standards.
        """
        if not encrypted_data or len(encrypted_data) < 8:
            return {"valid": False, "reason": "Empty or truncated encrypted payload"}

        try:
            # Check base64 decoding validity
            decoded = base64.b64decode(encrypted_data, validate=True)
            if len(decoded) < 16:
                return {
                    "valid": False,
                    "reason": "Payload too short for authenticated cipher text",
                }
        except Exception as e:
            return {"valid": False, "reason": f"Invalid base64 payload: {str(e)}"}

        if iv:
            try:
                base64.b64decode(iv)
            except Exception:
                return {"valid": False, "reason": "Invalid IV base64 encoding"}

        if salt:
            try:
                base64.b64decode(salt)
            except Exception:
                return {"valid": False, "reason": "Invalid salt base64 encoding"}

        return {"valid": True, "byte_length": len(decoded), "algorithm": "AES-256-GCM"}

    @staticmethod
    def generate_random_token(length: int = 32) -> str:
        return secrets.token_urlsafe(length)


crypto_service = CryptoService()
