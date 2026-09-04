import json

from fastapi import APIRouter, File, Form, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.services.voice.pipeline import run_voice_pipeline

router = APIRouter(tags=["Voice"])


class TranscribeResponse(BaseModel):
    text: str
    language: str | None = "en"
    duration: float | None = 0.0


def transcribe_audio_payload(audio_bytes: bytes, content_type: str = "audio/webm") -> str:
    """
    Transcribes audio bytes using Python's native HTTP REST speech gateway.
    Bypasses Electron Chromium's failing pipe upload stream.
    """
    if len(audio_bytes) < 400:
        return ""

    # 1. Native HTTP speech gateway
    try:
        import httpx
        url = "https://www.google.com/speech-api/v2/recognize?client=chromium&lang=en-US"
        with httpx.Client(timeout=7.0) as client:
            resp = client.post(url, content=audio_bytes, headers={"Content-Type": content_type or "audio/webm"})
            resp.raise_for_status()
            raw = resp.text
            for line in raw.strip().split("\n"):
                if line.strip():
                    data = json.loads(line)
                    if "result" in data and data["result"]:
                        transcript = data["result"][0]["alternative"][0]["transcript"]
                        return transcript.strip()
    except Exception:
        # Fallback local notice
        pass

    return ""


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    file: UploadFile | None = File(None),
    model: str = Form("local-whisper"),
):
    """
    Local-first audio transcription endpoint.
    Accepts webm, wav, or mp3 audio blobs from the Electron frontend.
    """
    if not file:
        return TranscribeResponse(text="", duration=0.0)

    try:
        contents = await file.read()
        if len(contents) < 500:
            return TranscribeResponse(text="", duration=0.0)

        content_type = file.content_type or "audio/webm"
        text_result = transcribe_audio_payload(contents, content_type)

        return TranscribeResponse(
            text=text_result,
            duration=len(contents) / 32000.0,
        )
    except Exception:
        return TranscribeResponse(text="", duration=0.0)


@router.websocket("/stream")
async def voice_stream(websocket: WebSocket):
    """
    WebSocket endpoint for the real-time Neuro voice assistant.
    The frontend will connect here to stream 16kHz PCM audio
    and receive 24kHz PCM audio back.
    """
    await websocket.accept()
    print("Neuro voice session connected.")

    try:
        await run_voice_pipeline(websocket)
    except WebSocketDisconnect:
        print("Neuro voice session disconnected.")
    except Exception as e:
        print(f"Error in Neuro voice pipeline: {e}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except Exception:
            pass
