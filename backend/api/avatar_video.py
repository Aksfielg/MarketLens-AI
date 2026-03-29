import os
import time
import requests
from typing import List, Dict, Any
from fastapi import HTTPException
from google.generativeai import GenerativeModel
import google.generativeai as genai

# Initialize Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini_model = GenerativeModel('gemini-1.5-flash')

async def create_avatar_video(signals: List[Dict[str, Any]]) -> str:
    """
    Create an avatar video using D-ID API with ElevenLabs voice integration
    
    Args:
        signals: List of signal dictionaries containing stock information
        
    Returns:
        str: URL of the generated MP4 video
    """
    try:
        # Step 1: Generate script using Gemini
        script = await generate_news_script(signals)
        
        # Step 2: Create D-ID talk with ElevenLabs voice
        did_api_key = os.getenv("D_ID_API_KEY")
        elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
        elevenlabs_voice_id = os.getenv("ELEVEN_VOICE_ID")
        
        if not all([did_api_key, elevenlabs_api_key, elevenlabs_voice_id]):
            raise HTTPException(
                status_code=500, 
                detail="Missing required API keys for video generation"
            )
        
        # D-ID API request
        did_url = "https://api.d-id.com/talks"
        
        headers = {
            "Authorization": f"Basic {did_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "source_url": "https://d-id-public-bucket.s3.amazonaws.com/or-Andrew.jpg",
            "script": {
                "type": "text",
                "input": script,
                "provider": {
                    "type": "elevenlabs",
                    "voice_id": elevenlabs_voice_id,
                    "api_key": elevenlabs_api_key
                }
            },
            "config": {
                "fluent": True,
                "pad_audio": 0.0
            }
        }
        
        # Create talk
        response = requests.post(did_url, json=payload, headers=headers)
        response.raise_for_status()
        
        talk_data = response.json()
        talk_id = talk_data.get("id")
        
        if not talk_id:
            raise HTTPException(
                status_code=500,
                detail="Failed to create D-ID talk"
            )
        
        # Step 3: Poll for completion
        result_url = await poll_did_status(talk_id, did_api_key)
        
        return result_url
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"D-ID API error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Video generation failed: {str(e)}"
        )

async def generate_news_script(signals: List[Dict[str, Any]]) -> str:
    """
    Generate a 45-second news script based on the provided signals
    
    Args:
        signals: List of signal dictionaries
        
    Returns:
        str: Generated news script (approximately 45 seconds)
    """
    # Format signals for the prompt
    signal_text = "\n".join([
        f"- {signal.get('symbol', 'Unknown')}: {signal.get('pattern', 'Unknown pattern')} "
        f"with {signal.get('win_rate', 0)}% win rate"
        for signal in signals
    ])
    
    prompt = f"""
    You are a financial news anchor for MarketLens AI. Create a 45-second news script (approximately 120-130 words) 
    based on these trading signals:
    
    {signal_text}
    
    Requirements:
    - Start with a professional news opening
    - Cover each signal briefly and professionally
    - Include the win rates and what they mean
    - End with a market outlook summary
    - Keep it exactly 45 seconds when read at normal speaking pace
    - Make it sound like a real financial news broadcast
    - Do not include any technical jargon that average investors wouldn't understand
    - Be engaging and informative
    """
    
    try:
        response = gemini_model.generate_content(prompt)
        script = response.text
        
        # Clean up the script
        script = script.replace("```", "").strip()
        
        # Ensure it's not too long (45 seconds ≈ 135 words at normal pace)
        words = script.split()
        if len(words) > 140:
            # Trim down to approximately 135 words
            script = " ".join(words[:135]) + "."
        
        return script
        
    except Exception as e:
        # Fallback script if Gemini fails
        return f"""
        Welcome to MarketLens AI Financial News. We're tracking several key trading signals today. 
        Our analysis shows {len(signals)} important patterns emerging in the market. 
        These signals indicate potential opportunities for investors. 
        The win rates suggest favorable conditions for strategic positioning. 
        Market sentiment appears positive based on our technical indicators. 
        This has been your MarketLens AI market update. Stay tuned for more insights.
        """

async def poll_did_status(talk_id: str, did_api_key: str, max_wait_time: int = 300) -> str:
    """
    Poll D-ID API until the video is ready
    
    Args:
        talk_id: D-ID talk ID
        did_api_key: D-ID API key
        max_wait_time: Maximum time to wait in seconds
        
    Returns:
        str: Result URL of the generated video
    """
    status_url = f"https://api.d-id.com/talks/{talk_id}"
    headers = {
        "Authorization": f"Basic {did_api_key}",
        "Content-Type": "application/json"
    }
    
    start_time = time.time()
    
    while time.time() - start_time < max_wait_time:
        try:
            response = requests.get(status_url, headers=headers)
            response.raise_for_status()
            
            talk_data = response.json()
            status = talk_data.get("status")
            
            if status == "done":
                result_url = talk_data.get("result_url")
                if result_url:
                    return result_url
                else:
                    raise HTTPException(
                        status_code=500,
                        detail="Video completed but no result URL provided"
                    )
            elif status == "failed":
                error_msg = talk_data.get("error", "Unknown error")
                raise HTTPException(
                    status_code=500,
                    detail=f"Video generation failed: {error_msg}"
                )
            
            # Wait 5 seconds before polling again
            await asyncio.sleep(5)
            
        except requests.exceptions.RequestException as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to poll D-ID status: {str(e)}"
            )
    
    raise HTTPException(
        status_code=408,
        detail="Video generation timed out"
    )

# Import asyncio for polling
import asyncio
