from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import re
# from ..dependencies import get_db, get_current_user
# from .. import models, schemas
# from ..services.gemini import get_chat_response

router = APIRouter(
    prefix="/api/chat",
    tags=["chat"],
    responses={404: {"description": "Not found"}},
)

# A simple regex to find potential stock symbols (e.g., RELIANCE, HDFCBANK)
STOCK_SYMBOL_REGEX = r'\b[A-Z&]{3,15}\b'

def get_db():
    # Placeholder for dependency
    pass
def get_current_user():
    # Placeholder for dependency
    return {"uid": "test-user"}


@router.post("/")
async def handle_chat_message(
    # message_in: schemas.ChatMessage,
    # db: Session = Depends(get_db),
    # user: dict = Depends(get_current_user)
):
    """
    Handles a user's chat message, detects stock symbols, fetches context,
    and gets a response from an AI model.
    """
    # For demo, we'll just use the request body directly
    # In a real app, use Pydantic models (schemas.ChatMessage)
    from fastapi import Request
    request_data = await Request.instance.json()
    message = request_data.get('message')
    user_id = request_data.get('user_id')

    # 1. Detect stock symbols in the message
    mentioned_symbols = re.findall(STOCK_SYMBOL_REGEX, message.upper())
    
    context_data = ""
    if mentioned_symbols:
        # 2. Fetch latest signal data for mentioned stocks from DB
        # In a real app, you would query your 'patterns' table
        # signals = db.query(models.Pattern).filter(models.Pattern.symbol.in_(mentioned_symbols)).order_by(models.Pattern.detected_date.desc()).limit(5).all()
        # context_data = f"Latest signals for {', '.join(mentioned_symbols)}: {str(signals)}"
        
        # Dummy data for now
        context_data = f"CONTEXT DATA: RELIANCE today shows RSI at 34 — that's oversold territory. A bullish divergence pattern was detected yesterday with a 68% historical win rate."

    # 3. Build context prompt for Gemini
    system_prompt = "You are MarketLens AI, a helpful financial assistant for Indian retail investors. Always base answers on the real data provided. Be concise and clear (2-3 sentences). Never give direct buy/sell recommendations."
    
    full_prompt = f"SYSTEM: {system_prompt}\n\n{context_data}\n\nUSER QUESTION: {message}\n\nAnswer in 2-3 sentences. If relevant, mention historical win rates. If no data available, say so honestly."

    # 4. Get response from AI service
    # ai_response_text = get_chat_response(full_prompt)
    
    # Dummy response for now
    ai_response_text = f"RELIANCE is currently in oversold territory with an RSI of 34. A bullish divergence pattern was spotted yesterday, which has historically led to positive returns 68% of the time. This suggests a potential for a bounce. View full signal →"

    # 5. Save chat history to database
    # new_chat = models.ChatHistory(user_id=user_id, message=message, response=ai_response_text)
    # db.add(new_chat)
    # db.commit()

    return {"response": ai_response_text}
