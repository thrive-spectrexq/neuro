from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.voice.pipeline import run_voice_pipeline

router = APIRouter(tags=["Voice"])


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
        # Pass the websocket directly to Pipecat's transport
        await run_voice_pipeline(websocket)
    except WebSocketDisconnect:
        print("Neuro voice session disconnected.")
    except Exception as e:
        print(f"Error in Neuro voice pipeline: {e}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except Exception:
            pass
