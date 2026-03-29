import os, json, requests, asyncio
from fastapi import APIRouter
from fastapi.responses import JSONResponse
import google.generativeai as genai

router = APIRouter()
ELEVEN_API_KEY = os.getenv('ELEVENLABS_API_KEY')
GEMINI_KEY = os.getenv('GEMINI_API_KEY')

@router.post("/api/generate-video-script")
async def generate_video_script(body: dict):
    signals = body.get('signals', [])
    video_type = body.get('type', 'daily')
    
    if GEMINI_KEY:
        genai.configure(api_key=GEMINI_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        signals_text = '\n'.join([f"- {s['symbol']}: {s['pattern']}, Win Rate {s['win_rate']}%, Conviction {s['conviction_score']}" for s in signals[:3]])
        
        prompt = f"""You are a professional Indian financial news presenter making a 60-second market update video.

Today's date: {__import__('datetime').date.today().strftime('%d %B %Y')}
Top signals:
{signals_text}
Nifty: +0.82%, BankNifty: +1.12%

Write exactly 4 scenes as a JSON array. Each scene must have narration under 30 words (for 15 seconds of speaking):
[
  {{"scene": 1, "title": "Market Overview", "duration": 12, "narration": "Good morning investors! Today Nifty gained 0.82 percent. Our AI scanned 200 NSE stocks and found strong signals. Here are today's top opportunities."}},
  {{"scene": 2, "title": "{signals[0]['symbol'] if signals else 'RELIANCE'} Signal", "duration": 16, "narration": "First signal: {signals[0]['symbol'] if signals else 'RELIANCE'} showing {signals[0]['pattern'] if signals else 'RSI Divergence'}. Historical win rate is {signals[0]['win_rate'] if signals else 67} percent across {signals[0]['occurrences'] if signals else 12} occurrences in two years."}},
  {{"scene": 3, "title": "{signals[1]['symbol'] if len(signals)>1 else 'HDFCBANK'} Signal", "duration": 16, "narration": "Second signal: {signals[1]['symbol'] if len(signals)>1 else 'HDFCBANK'} detected {signals[1]['pattern'] if len(signals)>1 else 'Volume Breakout'} with conviction score {signals[1]['conviction_score'] if len(signals)>1 else 79} out of 100."}},
  {{"scene": 4, "title": "Summary", "duration": 16, "narration": "Remember: these are AI-detected patterns based on historical data. Always do your research before investing. Visit MarketLens AI for the full analysis. Invest wisely!"}}
]

Return ONLY the JSON array, no other text."""
        
        try:
            response = model.generate_content(prompt)
            text = response.text.strip().replace('```json','').replace('```','').strip()
            script = json.loads(text)
            return JSONResponse({"success": True, "script": script})
        except Exception as e:
            pass
    
    # Fallback script
    script = [
        {"scene":1,"title":"Market Overview","duration":12,"narration":f"Good morning investors! Nifty gained 0.82 percent today. Our AI scanned 200 NSE stocks and found {len(signals)} high-conviction signals for you."},
        {"scene":2,"title":f"{signals[0]['symbol'] if signals else 'RELIANCE'} Signal","duration":16,"narration":f"{signals[0]['symbol'] if signals else 'RELIANCE'} shows {signals[0]['pattern'] if signals else 'RSI Divergence'} with {signals[0]['win_rate'] if signals else 67} percent historical win rate across {signals[0]['occurrences'] if signals else 12} occurrences in 2 years."},
        {"scene":3,"title":f"{signals[1]['symbol'] if len(signals)>1 else 'HDFCBANK'} Signal","duration":16,"narration":f"{signals[1]['symbol'] if len(signals)>1 else 'HDFCBANK'} detected {signals[1]['pattern'] if len(signals)>1 else 'Volume Breakout'} with conviction score of {signals[1]['conviction_score'] if len(signals)>1 else 79} out of 100."},
        {"scene":4,"title":"Summary","duration":16,"narration":"These signals are AI-detected based on real historical patterns. Always research before investing. Visit MarketLens AI for complete analysis. Invest wisely!"}
    ]
    return JSONResponse({"success": True, "script": script})

@router.post("/api/generate-narration")
async def generate_narration(body: dict):
    text = body.get('text', '').strip()
    ELEVEN_KEY = os.getenv('ELEVENLABS_API_KEY', '')
    
    # Debug logging
    print(f"DEBUG: Received text: '{text}'")
    print(f"DEBUG: ELEVENLABS_API_KEY exists: {'Yes' if ELEVEN_KEY else 'No'}")
    print(f"DEBUG: ELEVENLABS_API_KEY length: {len(ELEVEN_KEY) if ELEVEN_KEY else 0}")
    
    if not ELEVEN_KEY or not text:
        return JSONResponse({"error": "Missing API key or text", "audio_base64": None})
    
    # Use a reliable voice ID
    VOICE_IDS = [
        "EXAVITQu4vr4xnSDxMaL",  # Rachel (female, clear)
        "21m00Tcm4TlvDq8ikWAM",  # Adam (male)
        "AZnzlk1XvdvUeBnXmlld",  # Domi (female, warm)
    ]
    
    for voice_id in VOICE_IDS:
        try:
            response = requests.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={
                    "Accept": "audio/mpeg",
                    "xi-api-key": ELEVEN_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "text": text,
                    "model_id": "eleven_monolingual_v1",
                    "voice_settings": {
                        "stability": 0.6,
                        "similarity_boost": 0.8,
                        "style": 0.2,
                        "use_speaker_boost": True
                    }
                },
                timeout=30
            )
            
            print(f"ElevenLabs status: {response.status_code}")
            
            if response.status_code == 200:
                import base64
                audio_b64 = base64.b64encode(response.content).decode('utf-8')
                print(f"Audio generated: {len(response.content)} bytes")
                return JSONResponse({"audio_base64": audio_b64, "voice_id": voice_id})
            elif response.status_code == 401:
                return JSONResponse({"error": "Invalid ElevenLabs API key. Check ELEVENLABS_API_KEY in .env"})
            elif response.status_code == 429:
                return JSONResponse({"error": "ElevenLabs rate limit. Free tier: 10k chars/month"})
            else:
                print(f"Voice {voice_id} failed: {response.status_code}, trying next...")
                continue
        except Exception as e:
            print(f"ElevenLabs error: {e}")
            continue
    
    return JSONResponse({"error": "All voice IDs failed", "audio_base64": None})

@router.post("/api/generate-avatar-video")
async def generate_avatar_video(body: dict):
    D_ID_KEY = os.getenv('D_ID_API_KEY', '')
    if not D_ID_KEY:
        return JSONResponse({"error": "D_ID_API_KEY not set in .env"}, status_code=400)
    
    script_text = body.get('script_text', 'Good morning investors! Welcome to MarketLens AI daily market update.')
    
    # D-ID uses Basic auth with key:
    import base64
    auth = base64.b64encode(f"{D_ID_KEY}:".encode()).decode()
    
    headers = {
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json"
    }
    
    # Step 1: Create the talking video
    try:
        create_resp = requests.post(
            "https://api.d-id.com/talks",
            headers=headers,
            json={
                "source_url": "https://d-id-public-bucket.s3.amazonaws.com/alice.jpg",
                "script": {
                    "type": "text",
                    "provider": {
                        "type": "elevenlabs",
                        "voice_id": "EXAVITQu4vr4xnSDxMaL"
                    },
                    "input": script_text[:500]  # D-ID has character limits
                },
                "config": {"fluent": True, "pad_audio": 0}
            },
            timeout=30
        )
        
        if create_resp.status_code not in [200, 201]:
            return JSONResponse({"error": f"D-ID create failed: {create_resp.status_code} - {create_resp.text[:200]}"})
        
        talk_id = create_resp.json().get('id')
        if not talk_id:
            return JSONResponse({"error": "No talk ID returned"})
        
        # Step 2: Poll for completion (max 60 seconds)
        for attempt in range(12):
            await asyncio.sleep(5)
            status_resp = requests.get(
                f"https://api.d-id.com/talks/{talk_id}",
                headers=headers,
                timeout=15
            )
            status_data = status_resp.json()
            status = status_data.get('status')
            
            if status == 'done':
                video_url = status_data.get('result_url')
                return JSONResponse({
                    "success": True,
                    "video_url": video_url,
                    "talk_id": talk_id
                })
            elif status == 'error':
                return JSONResponse({"error": f"D-ID rendering failed: {status_data.get('error', {})}"})
        
        return JSONResponse({"error": "Timeout after 60 seconds. Video may still be generating."})
    
    except Exception as e:
        return JSONResponse({"error": str(e)})
