from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os, re

router = APIRouter(prefix="/api/notify", tags=["notify"])


class RegisterPhoneRequest(BaseModel):
    phone: str


def _to_e164(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return f"+{digits}"


@router.post("/register")
async def register_phone(request: RegisterPhoneRequest):
    phone = request.phone.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="phone is required")

    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token  = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_PHONE_NUMBER")

    if not all([account_sid, auth_token, from_number]):
        return {"success": True, "sent": False}

    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)
        msg = client.messages.create(
            body=(
                "You're set up for Scout lead alerts! "
                "We'll text you when new construction leads match your profile. "
                "— Scout by BuildMapper"
            ),
            from_=from_number,
            to=_to_e164(phone),
        )
        return {"success": True, "sent": True, "sid": msg.sid}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SMS send failed: {str(e)}")
