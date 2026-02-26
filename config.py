"""
WORLDSIM: India Ecosystem — Central Configuration
All simulation parameters in one place.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ─── Firebase ─────────────────────────────────────────────────────────────────

FIREBASE_KEY_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH", "./serviceAccountKey.json")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "amar-swaroop-db")

# ─── Ollama / LLM ────────────────────────────────────────────────────────────

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("LLM_MODEL", "qwen2.5-coder:1.5b")
OLLAMA_TIMEOUT = 60  # seconds per LLM call
OLLAMA_MAX_RETRIES = 2

# ─── Simulation Tick ──────────────────────────────────────────────────────────

DEFAULT_TICKS = 100
TICK_DELAY_SECONDS = 0.5  # Delay between ticks (for observation)

# ─── LLM Trigger Thresholds ──────────────────────────────────────────────────

LLM_DEFICIT_THRESHOLD = 0.15       # Invoke Governor if any resource < 15% of start
LLM_PERIODIC_INTERVAL = 10        # Invoke Governor every N ticks regardless
FEDERAL_ASSEMBLY_INTERVAL = 50    # Federal Assembly every N ticks
FEDERAL_ASSEMBLY_MAJORITY = 0.6   # 60% of governors must agree to pass resolution

# ─── Climate Engine ──────────────────────────────────────────────────────────

CLIMATE_EVENT_PROBABILITY = 0.05  # 5% chance per tick of a climate event
CLIMATE_MIN_INTERVAL = 5          # Minimum ticks between climate events

# ─── Trade & Economy ─────────────────────────────────────────────────────────

MAX_TRADE_QUANTITY = 2000         # Max units per trade order
TARIFF_PER_DISTRUST = 0.005      # Extra cost per trust point below 100
KARMA_RELIEF_BONUS = 5.0         # Diplomatic leverage gained by sending relief

# ─── Treaty System ────────────────────────────────────────────────────────────

MAX_ACTIVE_TREATIES_PER_STATE = 5
TREATY_BREACH_TRUST_PENALTY = 15  # Trust score loss on breach
TREATY_HONOR_TRUST_BONUS = 2      # Trust score gain per honored tick

# ─── Reward Function ─────────────────────────────────────────────────────────

REWARD_LAMBDA = 0.5               # Gini inequality penalty weight
WELFARE_MIGRATION_THRESHOLD = 35.0
MIGRATION_RATE = 0.02             # % of population that migrates per tick

# ─── Resource Normalization (for state vectors) ──────────────────────────────

RESOURCE_MAX = {
    "water": 15000,
    "energy": 15000,
    "food": 15000,
    "tech": 12000,
}

# ─── State Codes ──────────────────────────────────────────────────────────────

STATE_CODES = ["PB", "MH", "TN", "KA", "GJ", "UP", "BR", "WB", "RJ", "MP"]

STATE_NAMES = {
    "PB": "Punjab",
    "MH": "Maharashtra",
    "TN": "Tamil Nadu",
    "KA": "Karnataka",
    "GJ": "Gujarat",
    "UP": "Uttar Pradesh",
    "BR": "Bihar",
    "WB": "West Bengal",
    "RJ": "Rajasthan",
    "MP": "Madhya Pradesh",
}
