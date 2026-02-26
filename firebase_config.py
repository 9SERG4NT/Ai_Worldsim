"""
WORLDSIM: India Ecosystem — Firebase Configuration
Initializes the Firebase Admin SDK and exports the Firestore client.
"""

import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ─── Firebase Initialization ────────────────────────────────────────────────

_app = None
_db = None


def initialize_firebase():
    """Initialize Firebase Admin SDK with service account credentials."""
    global _app, _db

    if _app is not None:
        return _db

    key_path = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_KEY_PATH", "./serviceAccountKey.json"
    )
    project_id = os.getenv("FIREBASE_PROJECT_ID", "amar-swaroop-db")

    if not os.path.exists(key_path):
        raise FileNotFoundError(
            f"Firebase service account key not found at: {key_path}\n"
            f"Download it from: https://console.firebase.google.com/project/"
            f"{project_id}/settings/serviceaccounts/adminsdk\n"
            f"Save it as '{key_path}' in the project root."
        )

    cred = credentials.Certificate(key_path)
    _app = firebase_admin.initialize_app(cred, {"projectId": project_id})
    _db = firestore.client()

    print(f"✅ Firebase initialized for project: {project_id}")
    return _db


def get_db():
    """Get the Firestore client instance. Initializes if not already done."""
    global _db
    if _db is None:
        initialize_firebase()
    return _db
