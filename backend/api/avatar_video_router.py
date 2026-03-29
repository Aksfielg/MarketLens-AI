import asyncio
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .avatar_video import create_avatar_video

router = APIRouter(prefix="/api/video", tags=["video"])

class SignalRequest(BaseModel):
    symbol: str
    pattern: str
    win_rate: int
    price: float
    conviction: int
    sector: str

class AvatarVideoRequest(BaseModel):
    signals: List[SignalRequest]

class AvatarVideoResponse(BaseModel):
    video_url: str
    message: str

@router.post("/create-avatar-video", response_model=AvatarVideoResponse)
async def create_avatar_video_endpoint(request: AvatarVideoRequest):
    """
    Create an avatar video using D-ID and ElevenLabs based on provided signals
    
    Args:
        request: Contains list of signals to include in the video
        
    Returns:
        AvatarVideoResponse: Contains the video URL and success message
    """
    try:
        # Convert signals to dict format
        signals_dict = [signal.dict() for signal in request.signals]
        
        if not signals_dict:
            raise HTTPException(
                status_code=400,
                detail="At least one signal must be provided"
            )
        
        # Generate the video
        video_url = await create_avatar_video(signals_dict)
        
        return AvatarVideoResponse(
            video_url=video_url,
            message="Avatar video generated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate avatar video: {str(e)}"
        )
