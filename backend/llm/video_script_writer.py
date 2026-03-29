import google.generativeai as genai
import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

# Configure the Gemini API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Load env vars for ElevenLabs
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVEN_VOICE_ID = os.getenv("ELEVEN_VOICE_ID")
TTS_URL = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVEN_VOICE_ID}/stream"

def generate_scene_audio(script_json: dict):
    """
    Generates audio for each scene's narration using ElevenLabs API and saves it to a file.
    Updates the script JSON with the path to the audio file.
    """
    if "scenes" not in script_json:
        print("Error: 'scenes' not found in script_json")
        return script_json

    output_dir = "backend/output"
    os.makedirs(output_dir, exist_ok=True)

    headers = {
        "Accept": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }

    for scene in script_json["scenes"]:
        scene_id = scene.get("id")
        narration = scene.get("narration")
        
        if not all([scene_id, narration]):
            print(f"Skipping scene due to missing id or narration: {scene}")
            continue

        payload = {
            "text": narration,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.8,
                "style": 0.0,
                "use_speaker_boost": True
            }
        }

        audio_path = os.path.join(output_dir, f"scene_{scene_id}.mp3")

        try:
            response = requests.post(TTS_URL, json=payload, headers=headers, stream=True)
            response.raise_for_status()

            with open(audio_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=1024):
                    f.write(chunk)
            
            scene["audio_path"] = audio_path
            print(f"Successfully generated audio for scene {scene_id} at {audio_path}")

        except requests.exceptions.RequestException as e:
            print(f"Error generating audio for scene {scene_id}: {e}")
            scene["audio_path"] = None

    return script_json

def generate_video_script(signals: list):
    """
    Generates a video script in JSON format based on the top 3 stock signals.
    """
    # ... (rest of the function is unchanged)
    if not signals:
        return {"error": "No signals provided."}

    # Select the top 3 signals
    top_signals = signals[:3]

    system_prompt = """You are a high-energy financial news anchor for 'MarketLens AI', a popular show for Indian retail investors. Your tone is exciting, fast-paced, and optimistic, but you must stick to the facts provided. You are creating a script for a 60-second market update video.

You MUST return ONLY a valid JSON object. Do not include any other text or markdown formatting before or after the JSON. The JSON output must strictly follow this schema:
{
  "scenes": [
    {
      "id": int,
      "duration_seconds": int,
      "narration": "string",
      "visual": "string (e.g., 'nifty_chart', 'stock_chart', 'logo_reveal', 'outro_screen')",
      "data_overlay": {
        "symbol": "string (e.g., 'RELIANCE')",
        "win_rate": "string (e.g., '75%')",
        "pattern": "string (e.g., 'Bullish Engulfing')"
      }
    }
  ],
  "total_duration": "int (must be exactly 60)",
  "title": "string"
}

- The 'narration' should be punchy and engaging.
- The 'visual' for stock-specific scenes should be 'stock_chart'. Use 'nifty_chart' for intros or market overviews.
- The 'data_overlay' should contain the specific data for the signal being discussed in that scene. For intro/outro scenes, these can be empty strings.
- The total duration of all scenes must sum up to exactly 60 seconds.
- Create a catchy title for the video.
"""

    user_prompt = f"""
    Here are the top 3 signals for today's video script:
    1. {json.dumps(top_signals[0]) if len(top_signals) > 0 else 'N/A'}
    2. {json.dumps(top_signals[1]) if len(top_signals) > 1 else 'N/A'}
    3. {json.dumps(top_signals[2]) if len(top_signals) > 2 else 'N/A'}

    Generate the complete 60-second video script now.
    """

    model = genai.GenerativeModel(
        model_name='gemini-1.5-pro-latest',
        system_instruction=system_prompt,
    )

    try:
        response = model.generate_content(
            user_prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        
        # The response should be a valid JSON string, so we parse it.
        return json.loads(response.text)

    except Exception as e:
        print(f"An error occurred while calling the Gemini API: {e}")
        # In case of an API error, return a structured error message
        return {
            "error": "Failed to generate video script from AI model.",
            "details": str(e)
        }

if __name__ == '__main__':
    # Example usage with dummy data
    dummy_signals = [
        {
            "symbol": "TCS",
            "pattern_type": "Bullish Engulfing",
            "key_price": 3800.50,
            "conviction_score": 85,
            "description": "Strong buy signal detected as a bullish engulfing pattern formed near a key support level.",
            "win_rate": "78%" # Assuming win_rate is available
        },
        {
            "symbol": "INFY",
            "pattern_type": "Double Bottom",
            "key_price": 1450.00,
            "conviction_score": 75,
            "description": "A double bottom pattern suggests a potential reversal and upward trend.",
            "win_rate": "72%"
        },
        {
            "symbol": "RELIANCE",
            "pattern_type": "Cup and Handle",
            "key_price": 2900.00,
            "conviction_score": 92,
            "description": "Classic cup and handle formation indicates strong bullish continuation potential.",
            "win_rate": "85%"
        }
    ]

    video_script_json = generate_video_script(dummy_signals)

    if "error" not in video_script_json:
        print("--- Generated Video Script ---")
        print(json.dumps(video_script_json, indent=2))
        
        print("\n--- Generating Scene Audio ---")
        script_with_audio = generate_scene_audio(video_script_json)
        
        print("\n--- Final Script with Audio Paths ---")
        print(json.dumps(script_with_audio, indent=2))
    else:
        print("--- Error Generating Script ---")
        print(json.dumps(video_script_json, indent=2))
