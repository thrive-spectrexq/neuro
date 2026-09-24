import logging
from typing import Any

logger = logging.getLogger("neuro.voice.local_stt")


class LocalSTTService:
    """Local speech-to-text using faster-whisper for offline operation."""

    def __init__(self, model_size: str = "base", device: str = "auto", compute_type: str = "int8"):
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self._model = None

    def _load_model(self):
        if self._model is not None:
            return
        try:
            from faster_whisper import WhisperModel

            self._model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
            )
            logger.info(f"Loaded local STT model: {self.model_size} on {self.device}")
        except ImportError:
            logger.error("faster-whisper is not installed. Install with: pip install 'neuro-backend[voice]'")
            raise RuntimeError("faster-whisper is required for local STT")

    async def transcribe(
        self,
        audio_data: bytes,
        language: str = "en",
        **kwargs: Any,
    ) -> str:
        """Transcribe audio bytes to text using local Whisper model."""
        import os
        import tempfile

        self._load_model()

        # Write audio bytes to a temporary file for faster-whisper
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        try:
            segments, info = self._model.transcribe(
                tmp_path,
                language=language,
                beam_size=5,
                vad_filter=True,
            )
            transcript = " ".join(segment.text.strip() for segment in segments)
            logger.info(
                f"Local STT transcription complete: "
                f"language={info.language} probability={info.language_probability:.2f} "
                f"duration={info.duration:.1f}s"
            )
            return transcript
        finally:
            os.unlink(tmp_path)

    def is_available(self) -> bool:
        """Check if faster-whisper is installed and a model can be loaded."""
        import importlib.util

        return importlib.util.find_spec("faster_whisper") is not None
