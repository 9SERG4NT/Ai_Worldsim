<div align="center">

# 🌍 WorldSim AI

### Multi-Agent Geopolitical Simulation Powered by Large Language Models

[![Python 3.9+](https://img.shields.io/badge/Python-3.9%2B-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![OpenRouter](https://img.shields.io/badge/LLM-OpenRouter-6C47FF)](https://openrouter.ai)

*Simulating India's interstate resource economics through autonomous AI governance*

</div>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Solution](#-solution)
- [Architecture](#-architecture)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Usage](#-usage)
- [Configuration](#%EF%B8%8F-configuration)

---

## 🧩 Problem Statement

Modeling the economic and political dynamics of interconnected regions is one of the hardest open problems in computational social science. Traditional approaches rely on static rulesets, fixed decision trees, or purely mathematical equilibrium models — none of which capture the **emergent**, **adaptive**, and often **irrational** behavior of real-world governance and diplomacy.

Key challenges include:

- **Resource interdependency** — regions cannot thrive in isolation; they must trade, cooperate, and compete for scarce resources like water, energy, food, and technology.
- **Climate volatility** — extreme weather events (droughts, cyclones, floods) create sudden shocks that ripple through interconnected economies.
- **Trust & diplomacy** — negotiations, treaties, and relief aid are driven by trust scores, political alignment, and self-interest — factors too nuanced for simple rule-based models.
- **Inequality dynamics** — without active balancing, wealth concentrates; with too much redistribution, growth stalls.

---

## 💡 Solution

**WorldSim AI** tackles this by deploying a **Dual-Brain Architecture** for each of 10 Indian states:

| Brain | Name | Role |
|-------|------|------|
| 🧮 **Brain 1** | **FinOps Agent** (The Quant) | Rule-based heuristic engine that analyzes resource ledgers, projects deficits/surpluses, calculates health scores, and generates structured trade & policy recommendations |
| 🧠 **Brain 2** | **Governor Agent** (The Diplomat) | LLM-powered autonomous agent that reads the FinOps report and makes strategic diplomatic decisions — negotiating trades, proposing treaties, voting in Federal Assembly sessions, and issuing policy speeches |

Each simulation **tick** represents one month of simulated time and executes an 11-step pipeline:

```
1. Produce & Consume Resources    →  Resource generation/consumption based on rates
2. Apply Internal Policies        →  Food subsidies, water taxes, energy tariffs
3. Enforce Active Treaties         →  Per-tick resource transfers + breach detection
4. FinOps Analysis (Quant Brain)  →  Deficit/surplus analysis + trade recommendations
5. Climate Engine                  →  Probabilistic weather events with geographic weighting
6. Governor LLM Decisions         →  AI-driven trade negotiations between states
7. Trade Matching                  →  Automated order matching for unresolved deficits
8. Migration Check                →  Population movement from low to high welfare states
9. Federal Assembly               →  Multi-governor policy debates + majority voting
10. Calculate Rewards & GDP       →  GDP scoring, Gini inequality tracking, welfare metrics
11. Firebase Sync                 →  Real-time state persistence to Firestore
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Dashboard (Vite)                      │
│  DashboardTab │ IndiaMapTab │ MacroAnalytics │ GovernorChat     │
│  TradeMap     │ FinOpsOrderBook │ FederalIntervention           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ WebSocket + REST
┌───────────────────────────┴─────────────────────────────────────┐
│                    FastAPI Server (api_server.py)                │
│         Tick loop • State broadcast • Intervention queue        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                 Simulation Engine (engine/)                      │
│                                                                 │
│  WorldEnvironment  ←→  ClimateEngine                            │
│        ↕                   ↕                                    │
│  TreatyManager     ←→  Parliament                               │
└───────────┬─────────────────────────────────────────────────────┘
            │
     ┌──────┴──────┐
     │   Agents    │
     │  per state  │
     ├─────────────┤
     │ FinOps (🧮) │ ← Rule-based deficit/surplus analysis
     │ Governor(🧠)│ ← LLM-powered diplomacy via OpenRouter
     └─────────────┘
```

---

## ✨ Key Features

- **🤖 10 Autonomous AI Governors** — Each Indian state (Punjab, Maharashtra, Tamil Nadu, Karnataka, Gujarat, Uttar Pradesh, Bihar, West Bengal, Rajasthan, Madhya Pradesh) governed by its own LLM agent.
- **📊 Dual-Brain Decision Making** — Quantitative FinOps analysis feeds into qualitative LLM-driven diplomacy.
- **🌪️ Dynamic Climate Engine** — Geographically-weighted events (Drought in Rajasthan, Cyclones in West Bengal, Floods in Bihar) with configurable probability and duration.
- **📜 Treaty System** — Multi-tick bilateral agreements with per-tick resource transfers, breach detection, and trust score impact.
- **🏛️ Federal Assembly** — Periodic parliamentary sessions where all 10 governors propose policies, debate, and vote with majority rules.
- **📈 Gini Stabilizer** — Automatic economic balancing: shocks when states converge too much, boosts when inequality grows too extreme.
- **🗺️ Real-Time Dashboard** — Interactive India map, trade flow visualization, governor chat logs, macro analytics, and manual intervention controls.
- **🔥 Firebase Integration** — Optional Firestore sync for persistent state, RL reward history, trade logs, and climate event tracking.
- **👤 Manual Interventions** — Dashboard users can inject economic shocks, boost resources, or trigger events to test resilience.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Python 3.9+, FastAPI, Uvicorn | Simulation engine, REST API, WebSocket server |
| **AI / LLM** | OpenRouter API (`openai/gpt-4o-mini`) | Governor agent decision-making, treaty negotiations, Federal Assembly debates |
| **Frontend** | React 18, Vite, Recharts | Real-time dashboard with interactive maps, charts, and chat |
| **Database** | Firebase / Firestore (optional) | Persistent state storage, RL reward history, trade & climate logs |
| **Data** | Pandas, NumPy | CSV data loading, simulation analytics |

---

## 📁 Project Structure

```
AI_Chatbot/
├── api_server.py              # FastAPI server (REST + WebSocket + tick loop)
├── config.py                  # All simulation parameters in one place
├── run_simulation.py          # Standalone CLI simulation runner
├── requirements.txt           # Python dependencies
│
├── agents/
│   ├── finops_agent.py        # Brain 1: Rule-based quant analysis
│   ├── governor_agent.py      # Brain 2: LLM-powered diplomatic agent
│   └── openrouter_client.py   # OpenRouter API client (OpenAI-compatible)
│
├── engine/
│   ├── world_env.py           # Core simulation engine (11-step tick pipeline)
│   ├── climate_engine.py      # Probabilistic climate event system
│   ├── treaty_manager.py      # Treaty lifecycle, enforcement & trust scoring
│   └── parliament.py          # Federal Assembly: propose → debate → vote
│
├── dashboard/
│   └── src/
│       ├── App.jsx            # Main app with tab navigation
│       └── components/
│           ├── DashboardTab.jsx         # State cards, resource bars, GDP charts
│           ├── IndiaMapTab.jsx          # Interactive SVG map of India
│           ├── MacroAnalytics.jsx       # Gini coefficient, global GDP trends
│           ├── GovernorChat.jsx         # Live governor negotiation feed
│           ├── TradeMap.jsx             # Trade flow visualization
│           ├── FinOpsOrderBook.jsx      # Order book display
│           ├── FederalIntervention.jsx  # Manual intervention controls
│           └── LandingPage.jsx          # Welcome / onboarding page
│
├── utils/
│   └── firestore_helpers.py   # Firestore CRUD operations
│
├── firebase_config.py         # Firebase initialization
├── seed_firestore.py          # Seed initial state data into Firestore
├── verify_firebase.py         # Firebase connection verification
├── csv_data_loader.py         # Load simulation data from CSV
└── .env                       # Environment variables (API keys)
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Python | 3.9 or higher |
| Node.js | 16 or higher |
| OpenRouter API Key | [Get one free →](https://openrouter.ai/) |

### 1. Clone & Install

```bash
git clone https://github.com/9SERG4NT/Ai_Worldsim.git
cd Ai_Worldsim

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file in the project root (or edit the existing one):

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
LLM_MODEL=openai/gpt-4o-mini
```

### 3. Start the Backend

```bash
# With Firebase (requires serviceAccountKey.json)
python api_server.py

# Without Firebase (standalone mode)
python api_server.py --no-firebase
```

The API server starts at **`http://localhost:8000`**.

### 4. Start the Dashboard

Open a new terminal:

```bash
cd dashboard
npm install
npm run dev
```

The dashboard opens at **`http://localhost:5173`**.

---

## 📖 Usage

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server status + current tick |
| `/snapshot` | GET | Full world state snapshot |
| `/ws` | WebSocket | Real-time tick updates |
| `/trades` | GET | Recent trade log |
| `/governor-log` | GET | Governor message feed |
| `/climate` | GET | Active climate events |
| `/intervene` | POST | Manual intervention injection |

### CLI Simulation Runner

```bash
# Run the simulation without the API server
python run_simulation.py --ticks 200 --delay 1
```

### Command Line Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--ticks` | 100 | Number of simulation ticks to run |
| `--delay` | 0.5 | Seconds between ticks |
| `--no-llm` | false | Quant-only mode (skip LLM calls) |
| `--no-firebase` | false | Skip Firebase sync |

---

## ⚙️ Configuration

All simulation parameters live in **`config.py`**:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | LLM model for governor agents |
| `DEFAULT_TICKS` | 100 | Simulation length |
| `TICK_DELAY_SECONDS` | 0.5 | Speed of simulation |
| `LLM_PERIODIC_INTERVAL` | 10 | Invoke all governors every N ticks |
| `CLIMATE_EVENT_PROBABILITY` | 0.05 | 5% chance per tick |
| `FEDERAL_ASSEMBLY_INTERVAL` | 50 | Assembly convenes every N ticks |
| `MAX_ACTIVE_TREATIES_PER_STATE` | 5 | Treaty cap per state |
| `REWARD_LAMBDA` | 0.5 | Gini inequality penalty weight |

### Simulated States

| Code | State | Code | State |
|------|-------|------|-------|
| PB | Punjab | UP | Uttar Pradesh |
| MH | Maharashtra | BR | Bihar |
| TN | Tamil Nadu | WB | West Bengal |
| KA | Karnataka | RJ | Rajasthan |
| GJ | Gujarat | MP | Madhya Pradesh |

### Resources Tracked

| Resource | Max Capacity | Role |
|----------|-------------|------|
| 💧 Water | 15,000 | Essential for welfare & agriculture |
| ⚡ Energy | 15,000 | Powers industry & GDP growth |
| 🌾 Food | 15,000 | Directly impacts welfare score |
| 💻 Tech | 12,000 | Primary GDP growth driver |

---

<div align="center">

**Built with 🧠 AI + ❤️ for India**

</div>
