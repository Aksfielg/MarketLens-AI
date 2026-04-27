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
        model = genai.GenerativeModel('gemini-2.5-flash')
        
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
    """
    Generate avatar video using D-ID API.
    The D-ID API key is already the full Basic credential (base64 encoded email:api_key).
    Pass it directly as Authorization: Basic {key} — do NOT re-encode.
    Falls back to local MoviePy render if D-ID fails.
    """
    import asyncio as _asyncio
    import base64, uuid
    from PIL import Image, ImageDraw, ImageFont

    script_text = body.get('script_text', 'Good morning investors! Welcome to MarketLens AI daily market update.')
    signals = body.get('signals', [])
    D_ID_KEY = os.getenv('D_ID_API_KEY', '')

    # ── Try D-ID first ────────────────────────────────────────────────────────
    if D_ID_KEY:
        headers = {
            # Key is ALREADY base64(email:password) — pass directly, no re-encoding
            "Authorization": f"Basic {D_ID_KEY}",
            "Content-Type": "application/json"
        }
        try:
            create_resp = requests.post(
                "https://api.d-id.com/talks",
                headers=headers,
                json={
                    # alice.jpg works on free tier; or-Andrew.jpg causes 500
                    "source_url": "https://d-id-public-bucket.s3.amazonaws.com/alice.jpg",
                    "script": {
                        "type": "text",
                        "input": script_text[:500],
                        # Microsoft neural TTS works on free tier;
                        # ElevenLabs provider requires paid D-ID plan
                        "provider": {
                            "type": "microsoft",
                            "voice_id": "en-US-JennyNeural"
                        }
                    },
                    "config": {"fluent": True, "pad_audio": 0}
                },
                timeout=30
            )
            print(f"D-ID create status: {create_resp.status_code}")

            if create_resp.status_code in [200, 201]:
                talk_id = create_resp.json().get('id')
                if talk_id:
                    # Poll for completion (max 90 seconds)
                    for _ in range(18):
                        await _asyncio.sleep(5)
                        status_resp = requests.get(
                            f"https://api.d-id.com/talks/{talk_id}",
                            headers=headers, timeout=15
                        )
                        status_data = status_resp.json()
                        status = status_data.get('status')
                        print(f"D-ID status: {status}")
                        if status == 'done':
                            return JSONResponse({
                                "success": True,
                                "video_url": status_data.get('result_url'),
                                "source": "d-id"
                            })
                        elif status == 'error':
                            print(f"D-ID error: {status_data.get('error')}")
                            break
            else:
                print(f"D-ID create failed: {create_resp.status_code} {create_resp.text[:200]}")
        except Exception as e:
            print(f"D-ID exception: {e}")

    # ── Fallback: Generate video locally with MoviePy + Pillow ────────────────
    print("Falling back to local video generation...")

    output_dir = os.path.join(os.path.dirname(__file__), '..', 'output')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"avatar_{uuid.uuid4().hex[:8]}.mp4")
    audio_path = None

    # Generate ElevenLabs audio
    ELEVEN_KEY = os.getenv('ELEVENLABS_API_KEY', '')
    if ELEVEN_KEY:
        try:
            resp = requests.post(
                "https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL",
                headers={"xi-api-key": ELEVEN_KEY, "Content-Type": "application/json"},
                json={"text": script_text[:500], "model_id": "eleven_monolingual_v1",
                      "voice_settings": {"stability": 0.6, "similarity_boost": 0.8}},
                timeout=30
            )
            if resp.status_code == 200:
                audio_path = os.path.join(output_dir, f"audio_{uuid.uuid4().hex[:8]}.mp3")
                with open(audio_path, 'wb') as f:
                    f.write(resp.content)
        except Exception as e:
            print(f"ElevenLabs error: {e}")

    # Build animated video frames
    W, H, FPS = 1280, 720, 24

    def get_font(size):
        for name in ["arialbd.ttf", "arial.ttf", "DejaVuSans-Bold.ttf", "DejaVuSans.ttf"]:
            try:
                return ImageFont.truetype(name, size)
            except:
                pass
        return ImageFont.load_default()

    def draw_frame(t, duration):
        img = Image.new('RGB', (W, H))
        draw = ImageDraw.Draw(img)
        # Gradient background
        for y in range(H):
            frac = y / H
            r = int(8 + 6 * frac)
            g = int(6 + 4 * frac)
            b = int(24 + 16 * frac)
            draw.line([(0, y), (W, y)], fill=(r, g, b))

        # Teal accent bar
        bw = int(W * 0.6)
        bx = (W - bw) // 2
        draw.rectangle([bx, 0, bx + bw, 4], fill=(0, 212, 170))

        # Logo
        lf = get_font(26)
        draw.text((44, 32), "MarketLens", font=lf, fill=(240, 240, 255))
        try:
            mw = lf.getlength("MarketLens")
        except:
            mw = 160
        draw.text((44 + mw + 4, 36), "AI", font=get_font(16), fill=(124, 58, 237))

        # LIVE dot
        draw.ellipse([W - 88, 30, W - 75, 43], fill=(255, 50, 50))
        draw.text((W - 68, 30), "LIVE", font=get_font(16), fill=(255, 255, 255))

        # Script text (word-wrapped)
        tf = get_font(46)
        words = script_text.split()
        lines, cur = [], []
        for w in words:
            test = ' '.join(cur + [w])
            try:
                tw = tf.getlength(test)
            except:
                tw = len(test) * 26
            if tw < W - 120:
                cur.append(w)
            else:
                lines.append(' '.join(cur))
                cur = [w]
        if cur:
            lines.append(' '.join(cur))

        total_h = len(lines[:4]) * 62
        y0 = (H - total_h) // 2
        for i, ln in enumerate(lines[:4]):
            try:
                tw = tf.getlength(ln)
            except:
                tw = len(ln) * 26
            x = (W - tw) // 2
            draw.text((x + 2, y0 + i * 62 + 2), ln, font=tf, fill=(0, 0, 0))
            draw.text((x, y0 + i * 62), ln, font=tf, fill=(230, 230, 255))

        # Signal pills
        if signals:
            pf = get_font(18)
            px, py = 40, H - 90
            for sig in signals[:4]:
                sym = sig.get('symbol', '?')
                score = int(sig.get('conviction_score', 0))
                lbl = f"  {sym} {score}  "
                try:
                    pw = pf.getlength(lbl) + 16
                except:
                    pw = len(lbl) * 11
                col = (0, 212, 170) if score > 70 else (245, 158, 11)
                draw.rounded_rectangle([px, py, px + pw, py + 34], radius=17, outline=col, width=2)
                draw.text((px + 8, py + 7), lbl, font=pf, fill=col)
                px += int(pw) + 14

        # Progress bar
        prog = t / max(duration, 1)
        draw.rectangle([0, H - 6, W, H], fill=(20, 20, 50))
        draw.rectangle([0, H - 6, int(W * prog), H], fill=(0, 212, 170))
        return img

    try:
        from moviepy.editor import VideoClip, AudioFileClip

        if audio_path and os.path.exists(audio_path):
            ac = AudioFileClip(audio_path)
            dur = ac.duration
            ac.close()
        else:
            dur = max(12, len(script_text.split()) * 0.45)

        def make_frame(t):
            import numpy as np
            return np.array(draw_frame(t, dur))

        clip = VideoClip(make_frame, duration=dur).set_fps(FPS)
        if audio_path and os.path.exists(audio_path):
            clip = clip.set_audio(AudioFileClip(audio_path))

        clip.write_videofile(output_path, fps=FPS, codec='libx264',
                             audio_codec='aac', preset='ultrafast', logger=None)
        clip.close()

        with open(output_path, 'rb') as f:
            video_b64 = base64.b64encode(f.read()).decode('utf-8')

        for p in [output_path, audio_path]:
            try:
                if p and os.path.exists(p):
                    os.remove(p)
            except:
                pass

        return JSONResponse({
            "success": True,
            "video_base64": video_b64,
            "source": "local",
            "duration": round(dur, 1)
        })

    except Exception as e:
        return JSONResponse({"error": f"Video generation failed: {str(e)}"}, status_code=500)
