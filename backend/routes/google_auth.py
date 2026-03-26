from flask import Blueprint, request, jsonify
from models import SessionLocal, User, UserProfile
import jwt, os, json, base64
from datetime import datetime, timedelta

google_auth_bp = Blueprint("google_auth", __name__)

@google_auth_bp.route("/google", methods=["POST"])
def google_auth():
    db = SessionLocal()
    try:
        data = request.get_json() or {}
        credential = data.get("credential")
        
        if not credential:
            return jsonify({"error": "No credential"}), 400
        
        parts = credential.split('.')
        if len(parts) != 3:
            return jsonify({"error": "Invalid credential"}), 400
        
        payload = parts[1] + '=' * (4 - len(parts[1]) % 4)
        decoded = json.loads(base64.urlsafe_b64decode(payload))
        
        email = decoded.get("email", "").lower().strip()
        name = decoded.get("name", "User")
        picture = decoded.get("picture", "")
        
        if not email:
            return jsonify({"error": "No email"}), 400
        
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(name=name, email=email, google_id=decoded.get("sub"), role="user")
            db.add(user)
            db.commit()
            db.refresh(user)
            
            profile = UserProfile(user_id=user.id, xp=0, level=1, badges=[])
            db.add(profile)
            db.commit()
        
        token_payload = {
            "user_id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "exp": datetime.utcnow() + timedelta(days=7),
            "iat": datetime.utcnow()
        }
        token = jwt.encode(token_payload, os.getenv("SECRET_KEY", "test"), algorithm="HS256")
        
        return jsonify({
            "token": token,
            "user": {"id": user.id, "name": user.name, "email": user.email, "picture": picture, "role": user.role}
        }), 200
    
    except Exception as e:
        db.rollback()
        print(f"Google auth error: {e}")
        return jsonify({"error": str(e)}), 500
    
    finally:
        db.close()
