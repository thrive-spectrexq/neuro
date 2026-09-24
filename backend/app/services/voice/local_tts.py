import logging
from typing import Any

logger = logging.getLogger("neuro.voice.local_tts")


class LocalTTSService:
    """Local text-to-speech for offline voice responses.

    Uses pyttsx3 as a cross-platform fallback engine.
    Can be extended to support Piper TTS or Coqui for higher quality.
    """

    def __init__(self, voice: str = "default", rate: int = 175):
        self.voice = voice
        self.rate = rate
        self._engine = None

    def _ensure_engine(self):
        if self._engine is not None:
            return
        try:
            import pyttsx3

            self._engine = pyttsx3.init()
            self._engine.setProperty("rate", self.rate)
            voices = self._engine.getProperty("voices")
            if voices and self.voice != "default":
                for v in voices:
                    if self.voice.lower() in v.name.lower():
                        self._engine.setProperty("voice", v.id)
                        break
            logger.info("Local TTS engine initialized")
        except ImportError:
            logger.warning("pyttsx3 is not installed. Local TTS unavailable. Install with: pip install pyttsx3")
            raise RuntimeError("pyttsx3 is required for local TTS")

    async def synthesize(self, text: str, **kwargs: Any) -> bytes:
        """Synthesize text to audio bytes.

        Returns WAV audio data as bytes.
        """
        import os
        import tempfile

        self._ensure_engine()

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            self._engine.save_to_file(text, tmp_path)
            self._engine.runAndWait()

            with open(tmp_path, "rb") as f:
                audio_data = f.read()

            logger.info(f"Local TTS synthesis complete: {len(text)} chars -> {len(audio_data)} bytes")
            return audio_data
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    async def speak(self, text: str) -> None:
        """Speak text through system audio output (synchronous playback)."""
        self._ensure_engine()
        self._engine.say(text)
        self._engine.runAndWait()

    def is_available(self) -> bool:
        """Check if pyttsx3 is installed."""
        import importlib.util

        return importlib.util.find_spec("pyttsx3") is not None

    def list_voices(self) -> list[dict[str, str]]:
        """List available system voices."""
        self._ensure_engine()
        voices = self._engine.getProperty("voices")
        return [{"id": v.id, "name": v.name, "languages": str(v.languages)} for v in (voices or [])]
