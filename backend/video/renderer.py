import os
from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips
from PIL import Image, ImageDraw, ImageFont

def render_video(script_json: dict, output_path='backend/output/daily_video.mp4'):
    """
    Renders a video from a script JSON object.

    - Creates a visual for each scene using Pillow.
    - Assembles video clips with audio using MoviePy.
    - Concatenates the clips and exports the final video.
    """
    clips = []
    temp_image_paths = []
    
    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    os.makedirs(output_dir, exist_ok=True)
    
    # Create a temporary directory for scene images
    temp_dir = os.path.join(output_dir, "temp_images")
    os.makedirs(temp_dir, exist_ok=True)

    try:
        # Use a common font or specify a path
        try:
            title_font = ImageFont.truetype("arial.ttf", 80)
            text_font = ImageFont.truetype("arial.ttf", 60)
        except IOError:
            print("Arial font not found. Using default font.")
            title_font = ImageFont.load_default()
            text_font = ImageFont.load_default()

        for i, scene in enumerate(script_json.get("scenes", [])):
            # --- 1. Pillow Drawing ---
            img = Image.new('RGB', (1920, 1080), color='#0a0a0a')
            draw = ImageDraw.Draw(img)
            
            data = scene.get("data_overlay", {})
            symbol = data.get("symbol", "")
            pattern = data.get("pattern", "")
            win_rate = data.get("win_rate", "")

            # Simple layout
            draw.text((100, 200), f"Symbol: {symbol}", font=title_font, fill="#FFFFFF")
            draw.text((100, 400), f"Pattern: {pattern}", font=text_font, fill="#CCCCCC")
            draw.text((100, 600), f"Win Rate: {win_rate}", font=text_font, fill="#CCCCCC")
            
            temp_image_path = os.path.join(temp_dir, f"scene_{i}.png")
            img.save(temp_image_path)
            temp_image_paths.append(temp_image_path)

            # --- 2. MoviePy Assembly ---
            audio_path = scene.get("audio_path")
            if not audio_path or not os.path.exists(audio_path):
                print(f"Warning: Audio file not found for scene {i}. Skipping audio for this clip.")
                audio_clip = None
            else:
                audio_clip = AudioFileClip(audio_path)

            image_clip = ImageClip(temp_image_path)
            
            if audio_clip:
                image_clip = image_clip.set_audio(audio_clip)
                # Use audio duration for the clip's duration
                image_clip = image_clip.set_duration(audio_clip.duration)
            else:
                # Fallback duration if audio is missing
                image_clip = image_clip.set_duration(scene.get("duration_seconds", 5))

            clips.append(image_clip)

        if not clips:
            print("No clips were created. Aborting video render.")
            return None

        # --- 3. Concatenate and Export ---
        final_clip = concatenate_videoclips(clips, method="compose")
        final_clip.write_videofile(output_path, fps=24, codec="libx264")
        
        print(f"Video successfully rendered to {output_path}")
        return output_path

    finally:
        # --- 4. Cleanup ---
        for path in temp_image_paths:
            try:
                os.remove(path)
            except OSError as e:
                print(f"Error removing temporary file {path}: {e}")
        try:
            os.rmdir(temp_dir)
        except OSError as e:
            print(f"Error removing temporary directory {temp_dir}: {e}")


if __name__ == '__main__':
    # Example usage with a dummy script JSON
    dummy_script = {
        "scenes": [
            {
                "id": 1,
                "duration_seconds": 8,
                "narration": "Welcome to MarketLens AI! Here are your top signals for today.",
                "visual": "nifty_chart",
                "data_overlay": {"symbol": "NIFTY 50", "win_rate": "", "pattern": "Market Overview"},
                "audio_path": "backend/output/scene_1.mp3" # Assume this was generated
            },
            {
                "id": 2,
                "duration_seconds": 15,
                "narration": "First up, we have a strong bullish signal in TCS.",
                "visual": "stock_chart",
                "data_overlay": {"symbol": "TCS", "win_rate": "78%", "pattern": "Bullish Engulfing"},
                "audio_path": "backend/output/scene_2.mp3" # Assume this was generated
            }
        ],
        "total_duration": 23,
        "title": "MarketLens Daily Signals"
    }
    
    # Create dummy audio files for testing
    from moviepy.editor import ColorClip, AudioArrayClip
    import numpy as np

    if not os.path.exists("backend/output"):
        os.makedirs("backend/output")

    # Create silent audio clips for the example to run
    for scene in dummy_script['scenes']:
        if not os.path.exists(scene['audio_path']):
            print(f"Creating dummy audio for {scene['audio_path']}")
            duration = scene['duration_seconds']
            # Create a silent audio clip of the correct duration
            dummy_audio_clip = AudioArrayClip(np.zeros((int(duration * 44100), 2)), fps=44100)
            dummy_audio_clip.write_audiofile(scene['audio_path'])

    render_video(dummy_script)
