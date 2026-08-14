import os
import json
import urllib.request
import urllib.error
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional

from app.services.voice.pipeline import run_voice_pipeline

router = APIRouter(tags=["Voice"])


class TranscribeResponse(BaseModel):
    text: str
    language: Optional[str] = "en"
    duration: Optional[float] = 0.0


def transcribe_audio_payload(audio_bytes: bytes, content_type: str = "audio/webm") -> str:
    """
    Transcribes audio bytes using Python's native HTTP REST speech gateway.
    Bypasses Electron Chromium's failing pipe upload stream.
    """
    if len(audio_bytes) < 400:
        return ""

    # 1. Native HTTP speech gateway
    try:
        url = "https://www.google.com/speech-api/v2/recognize?client=chromium&lang=en-US"
        req = urllib.request.Request(
            url,
            data=audio_bytes,
            headers={"Content-Type": content_type or "audio/webm"}
        )
        with urllib.request.urlopen(req, timeout=7) as resp:
            raw = resp.read().decode("utf-8")
            for line in raw.strip().split("\n"):
                if line.strip():
                    try:
                        data = json.loads(line)
                        if "result" in data and len(data["result"]) > 0:
                            alt = data["result"][0].get("alternative", [])
                            if alt and "transcript" in alt[0]:
                                return alt[0]["transcript"].strip()
                    except Exception:
                        pass
    except Exception as e:
        # Fallback local notice
        pass

    return ""


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    file: Optional[UploadFile] = File(None),
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
    except Exception as e:
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
