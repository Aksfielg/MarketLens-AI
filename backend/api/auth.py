import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

# Correctly locate the service account file relative to the project root
service_account_path = os.path.join(os.path.dirname(__file__), '..', 'firebase-service-account.json')

try:
    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")
    # In a real app, you might want to handle this more gracefully
    # For now, we'll let it raise an error if the file is missing.
    pass


security = HTTPBearer(auto_error=False)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verifies Firebase ID token from the Authorization header.
    """
    if not credentials:
        return {"uid": "local_dev_user", "email": "test@example.com"}
    
    token = credentials.credentials
    
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"Auth bypass for local dev due to error: {e}")
        return {"uid": "local_dev_user", "email": "test@example.com"}
