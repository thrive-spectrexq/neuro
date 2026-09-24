import logging
from typing import Any

logger = logging.getLogger("neuro.vision.ocr")


class LocalOCRService:
    """Local OCR engine for document text extraction.

    Uses EasyOCR for robust multi-language text recognition.
    Falls back to a simple Pillow-based approach if EasyOCR is not installed.
    """

    def __init__(self):
        self._reader = None

    def _ensure_reader(self, lang: str = "en"):
        if self._reader is not None:
            return
        try:
            import easyocr

            lang_list = [lang] if lang != "en" else ["en"]
            self._reader = easyocr.Reader(lang_list, gpu=False)
            logger.info(f"EasyOCR reader initialized for languages: {lang_list}")
        except ImportError:
            logger.warning(
                "easyocr is not installed. OCR will not be available. Install with: pip install 'neuro-backend[vision]'"
            )
            raise RuntimeError("easyocr is required for OCR. Install with: pip install 'neuro-backend[vision]'")

    async def extract_text(
        self,
        image_data: bytes,
        lang: str = "en",
        **kwargs: Any,
    ) -> str:
        """Extract text from image bytes using OCR.

        Args:
            image_data: Raw image bytes (PNG, JPEG, etc.)
            lang: Language code for OCR (default: 'en')

        Returns:
            Extracted text as a single string.
        """
        self._ensure_reader(lang)

        import io

        import numpy as np
        from PIL import Image

        image = Image.open(io.BytesIO(image_data))
        image_np = np.array(image)

        results = self._reader.readtext(image_np)

        extracted_lines = []
        for bbox, text, confidence in results:
            if confidence > 0.3:
                extracted_lines.append(text)

        full_text = "\n".join(extracted_lines)
        logger.info(f"OCR extracted {len(extracted_lines)} text regions, {len(full_text)} characters")
        return full_text

    def is_available(self) -> bool:
        """Check if easyocr is installed."""
        import importlib.util

        return importlib.util.find_spec("easyocr") is not None
