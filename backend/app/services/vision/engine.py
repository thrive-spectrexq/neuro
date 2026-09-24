import logging
import uuid
from typing import Any

logger = logging.getLogger("neuro.vision")


class VisionResult:
    """Result from a vision analysis operation."""

    def __init__(
        self,
        success: bool,
        text: str = "",
        analysis: dict[str, Any] | None = None,
        error: str | None = None,
    ):
        self.success = success
        self.text = text
        self.analysis = analysis or {}
        self.error = error

    def to_dict(self) -> dict[str, Any]:
        return {
            "success": self.success,
            "text": self.text,
            "analysis": self.analysis,
            "error": self.error,
        }


class VisionEngine:
    """Vision processing engine for the workspace.

    Capabilities:
    - Screen capture analysis
    - Image/document OCR
    - Scene understanding via multimodal models
    - Visual search across knowledge base
    """

    def __init__(self):
        self._ocr_service = None

    async def analyze_image(
        self,
        image_data: bytes,
        prompt: str = "Describe this image.",
        user_id: uuid.UUID | None = None,
    ) -> VisionResult:
        """Analyze an image using a vision-capable model.

        Falls back to OCR if no vision model is available.
        """
        try:
            # Try multimodal model via AI provider
            from app.services.ai.provider import get_ai_provider

            provider = get_ai_provider()
            provider_name = provider.__class__.__name__

            if provider_name != "MockAIProvider" and hasattr(provider, "analyze_image"):
                result = await provider.analyze_image(image_data, prompt)
                return VisionResult(success=True, text=result, analysis={"method": "multimodal_model"})
        except Exception as e:
            logger.warning(f"Multimodal analysis unavailable, falling back to OCR: {e}")

        # Fall back to OCR
        try:
            ocr_text = await self.ocr_document(image_data)
            return VisionResult(
                success=True,
                text=ocr_text,
                analysis={"method": "ocr_fallback", "char_count": len(ocr_text)},
            )
        except Exception as e:
            return VisionResult(success=False, error=str(e))

    async def capture_screen(self, user_id: uuid.UUID | None = None) -> bytes:
        """Capture current screen (desktop only).

        Returns PNG image data as bytes.
        """
        try:
            from PIL import ImageGrab

            screenshot = ImageGrab.grab()
            import io

            buffer = io.BytesIO()
            screenshot.save(buffer, format="PNG")
            buffer.seek(0)
            logger.info("Screen captured successfully")
            return buffer.read()
        except ImportError:
            raise RuntimeError(
                "Pillow is required for screen capture. Install with: pip install 'neuro-backend[vision]'"
            )
        except Exception as e:
            logger.error(f"Screen capture failed: {e}")
            raise

    async def ocr_document(self, image_data: bytes, lang: str = "en") -> str:
        """Extract text from document images using local OCR."""
        if self._ocr_service is None:
            from app.services.vision.ocr import LocalOCRService

            self._ocr_service = LocalOCRService()
        return await self._ocr_service.extract_text(image_data, lang=lang)

    async def analyze_screen(
        self,
        prompt: str = "Describe what is on this screen.",
        user_id: uuid.UUID | None = None,
    ) -> VisionResult:
        """Capture screen and analyze it."""
        try:
            screen_data = await self.capture_screen(user_id=user_id)
            return await self.analyze_image(screen_data, prompt=prompt, user_id=user_id)
        except Exception as e:
            return VisionResult(success=False, error=str(e))


vision_engine = VisionEngine()
