import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.vision import (
    VisionAnalyzeRequest,
    VisionAnalyzeResponse,
    VisionOCRResponse,
    VisionScreenResponse,
)
from app.services.vision.engine import vision_engine

router = APIRouter(tags=["Vision"])


@router.post("/analyze", response_model=VisionAnalyzeResponse)
async def analyze_image(
    prompt: str = Form("Describe this image."),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    try:
        contents = await file.read()
        user_id = current_user.id if hasattr(current_user, "id") else current_user.get("id")
        result = await vision_engine.analyze_image(contents, prompt=prompt, user_id=user_id)
        return VisionAnalyzeResponse(
            success=result.success,
            text=result.text,
            analysis=result.analysis,
            error=result.error,
        )
    except Exception as e:
        return VisionAnalyzeResponse(success=False, text="", error=str(e))


@router.post("/ocr", response_model=VisionOCRResponse)
async def ocr_document(
    file: UploadFile = File(...),
    lang: str = Form("en"),
    current_user: User = Depends(get_current_user),
):
    try:
        contents = await file.read()
        text = await vision_engine.ocr_document(contents, lang=lang)
        return VisionOCRResponse(
            success=True,
            text=text,
            char_count=len(text),
        )
    except Exception as e:
        return VisionOCRResponse(success=False, text="", char_count=0, error=str(e))


@router.post("/screen", response_model=VisionScreenResponse)
async def analyze_screen(
    prompt: str = Form("Describe what is on this screen."),
    current_user: User = Depends(get_current_user),
):
    try:
        user_id = current_user.id if hasattr(current_user, "id") else current_user.get("id")
        result = await vision_engine.analyze_screen(prompt=prompt, user_id=user_id)
        return VisionScreenResponse(
            success=result.success,
            text=result.text,
            analysis=result.analysis,
            error=result.error,
        )
    except Exception as e:
        return VisionScreenResponse(success=False, text="", error=str(e))
