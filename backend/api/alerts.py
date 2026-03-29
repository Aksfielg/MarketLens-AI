from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..dependencies import get_db, get_current_user
# from .. import models, schemas

router = APIRouter(
    prefix="/api/alerts",
    tags=["alerts"],
    responses={404: {"description": "Not found"}},
)

# In a real application, this would be in a separate worker process
def check_alerts(db: Session):
    """
    This function would be called periodically (e.g., after every data scan)
    to check if any active alerts have been triggered.
    """
    # active_alerts = db.query(models.Alert).filter(models.Alert.is_active == True).all()
    # for alert in active_alerts:
    #     # Logic to check if the alert condition is met
    #     # e.g., fetch latest price for alert.symbol
    #     # latest_price = get_latest_price(alert.symbol)
    #     triggered = False
    #     if alert.alert_type == 'price_above' and latest_price > alert.condition_value:
    #         triggered = True
    #     elif alert.alert_type == 'price_below' and latest_price < alert.condition_value:
    #         triggered = True
    #     # ... other alert types
        
    #     if triggered:
    #         alert.is_active = False
    #         alert.triggered_at = datetime.utcnow()
    #         # Create a notification
    #         # new_notification = models.Notification(user_id=alert.user_id, alert_id=alert.id, message=f"Alert for {alert.symbol} triggered!")
    #         # db.add(new_notification)
    #         db.commit()
    pass

@router.post("/")
def create_alert(
    # alert: schemas.AlertCreate, 
    db: Session = Depends(get_db), 
    user: dict = Depends(get_current_user)
):
    # db_alert = models.Alert(**alert.dict(), user_id=user['uid'])
    # db.add(db_alert)
    # db.commit()
    # db.refresh(db_alert)
    # return db_alert
    return {"message": "Alert created successfully", "user_id": user['uid']}

@router.get("/{user_id}")
def get_user_alerts(user_id: str, db: Session = Depends(get_db)):
    # alerts = db.query(models.Alert).filter(models.Alert.user_id == user_id).all()
    # return alerts
    # Dummy data for now
    return [
        {"id": 1, "symbol": "RELIANCE", "alert_type": "price_above", "condition_value": 3000, "is_active": True, "created_at": "2026-03-27T10:00:00Z", "status": "Watching"},
        {"id": 2, "symbol": "TCS", "alert_type": "pattern_detected", "condition_value": "RSI Div", "is_active": False, "triggered_at": "2026-03-28T09:15:00Z", "created_at": "2026-03-25T11:30:00Z", "status": "Triggered Today!"},
        {"id": 3, "symbol": "HDFCBANK", "alert_type": "price_below", "condition_value": 1400, "is_active": False, "created_at": "2026-03-20T14:00:00Z", "status": "Paused"},
    ]

@router.delete("/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    # alert = db.query(models.Alert).filter(models.Alert.id == alert_id, models.Alert.user_id == user['uid']).first()
    # if not alert:
    #     raise HTTPException(status_code=404, detail="Alert not found")
    # db.delete(alert)
    # db.commit()
    return {"message": "Alert deleted successfully"}
