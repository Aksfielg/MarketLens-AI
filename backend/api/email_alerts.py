import smtplib, os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import JSONResponse

router = APIRouter()

def send_alert_email(to_email: str, alert_data: dict):
    """Send alert email using Gmail SMTP"""
    sender_email = os.getenv('ALERT_EMAIL', 'your-gmail@gmail.com')
    sender_password = os.getenv('ALERT_EMAIL_PASSWORD', '')  # Gmail App Password
    
    if not sender_password:
        print(f"[EMAIL SKIPPED] Would send to {to_email}: {alert_data}")
        return False
    
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"🚨 MarketLens Alert: {alert_data['symbol']} — {alert_data['pattern']}"
    msg['From'] = f"MarketLens AI <{sender_email}>"
    msg['To'] = to_email
    
    html = f"""
    <html><body style="font-family:Arial,sans-serif;background:#060611;color:#F0F0FF;padding:20px">
      <div style="max-width:500px;margin:0 auto;background:#12121F;border-radius:12px;padding:24px;border:1px solid #00D4AA">
        
        <div style="display:flex;align-items:center;margin-bottom:20px">
          <div style="width:40px;height:40px;background:#00D4AA;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#060611;margin-right:12px">ML</div>
          <div>
            <div style="font-weight:700;font-size:16px">MarketLens AI</div>
            <div style="color:#8B8BA8;font-size:12px">Smart Stock Signal Alert</div>
          </div>
        </div>
        
        <div style="background:#1A1A2E;border-radius:8px;padding:16px;border-left:4px solid #00D4AA;margin-bottom:16px">
          <div style="font-size:20px;font-weight:700;color:#00D4AA;margin-bottom:4px">🚨 Alert Triggered!</div>
          <div style="font-size:24px;font-weight:700;margin-bottom:8px">{alert_data['symbol']} — {alert_data['pattern']}</div>
          <div style="color:#D0D0E0;font-size:14px;line-height:1.5">
            Price: ₹{alert_data.get('price','N/A')} | RSI: {alert_data.get('rsi','N/A')}<br>
            <strong style="color:#00D4AA">Historical Win Rate: {alert_data.get('win_rate','N/A')}%</strong> ({alert_data.get('occurrences','N/A')} occurrences)<br>
            Conviction Score: {alert_data.get('conviction_score','N/A')}/100
          </div>
        </div>
        
        <div style="background:#1A1A2E;border-radius:8px;padding:12px;margin-bottom:16px">
          <div style="font-weight:600;margin-bottom:4px">Recommendation:</div>
          <div style="color:#00D4AA;font-size:14px">{alert_data.get('recommendation','WATCH FOR ENTRY')} above ₹{alert_data.get('key_level','support')} support level</div>
        </div>
        
        <a href="http://localhost:5173/stock/{alert_data['symbol']}" 
           style="display:block;background:#00D4AA;color:#060611;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:700;margin-bottom:16px">
          View Full Analysis →
        </a>
        
        <div style="color:#8B8BA8;font-size:11px;text-align:center">
          This is an automated alert from MarketLens AI. Not financial advice.<br>
          Markets are volatile. Only invest what you can afford to lose.
        </div>
      </div>
    </body></html>
    """
    
    msg.attach(MIMEText(html, 'html'))
    
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())
        print(f"Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Email failed: {e}")
        return False

@router.post("/api/send-test-alert")
async def send_test_alert(body: dict, background_tasks: BackgroundTasks):
    email = body.get('email')
    alert_data = body.get('alert', {
        'symbol': 'RELIANCE', 'pattern': 'RSI Divergence',
        'price': '2450.75', 'rsi': '34.2', 'win_rate': 67,
        'occurrences': 12, 'conviction_score': 87, 'key_level': '2420',
        'recommendation': 'WATCH FOR ENTRY'
    })
    background_tasks.add_task(send_alert_email, email, alert_data)
    return JSONResponse({"message": f"Alert queued for {email}"})
