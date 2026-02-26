"""
WORLDSIM: India Ecosystem — API Server
FastAPI + WebSocket bridge between the Python simulation engine and the React dashboard.

Usage:
    python api_server.py                        # Run with LLM + Firebase
    python api_server.py --no-llm               # Quant-only mode
    python api_server.py --no-firebase           # Without Firebase
    python api_server.py --ticks 200 --delay 1   # 200 ticks, 1s delay
"""

import sys
import os
import json
import asyncio
import argparse
import time
import threading
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ["PYTHONIOENCODING"] = "utf-8"

# Fix Windows console encoding for Unicode characters
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from config import (
    DEFAULT_TICKS, TICK_DELAY_SECONDS, OLLAMA_MODEL, OLLAMA_BASE_URL,
    STATE_CODES, STATE_NAMES, RESOURCE_MAX
)

# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(title="WORLDSIM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global State ─────────────────────────────────────────────────────────────

class SimState:
    """Shared state between simulation thread and WebSocket handlers."""
    def __init__(self):
        self.env = None
        self.running = False
        self.tick = 0
        self.max_ticks = DEFAULT_TICKS
        self.latest_snapshot = {}
        self.latest_events = {}
        self.trade_log = []        # recent trades for the dashboard
        self.governor_log = []     # recent governor messages
        self.climate_log = []      # active climate events
        self.intervention_queue = []  # queued interventions from dashboard
        self.lock = threading.Lock()

    def add_trade(self, trade):
        with self.lock:
            self.trade_log.insert(0, trade)
            self.trade_log = self.trade_log[:50]

    def add_governor_msg(self, msg):
        with self.lock:
            self.governor_log.append(msg)
            self.governor_log = self.governor_log[-50:]

    def add_climate_event(self, event):
        with self.lock:
            self.climate_log.append(event)
            self.climate_log = self.climate_log[-30:]

    def queue_intervention(self, intervention):
        with self.lock:
            self.intervention_queue.append(intervention)

    def pop_interventions(self):
        with self.lock:
            interventions = list(self.intervention_queue)
            self.intervention_queue.clear()
            return interventions


sim = SimState()
connected_clients = set()

# ─── WebSocket Manager ────────────────────────────────────────────────────────

async def broadcast(data: dict):
    """Send data to all connected WebSocket clients."""
    if not connected_clients:
        return
    message = json.dumps(data, default=str)
    disconnected = set()
    for ws in connected_clients:
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.add(ws)
    connected_clients.difference_update(disconnected)


# ─── Simulation Thread ────────────────────────────────────────────────────────

def apply_intervention(env, intervention):
    """Apply a federal intervention to the simulation state.
    
    GDP Impact Formula:
      - Resource crises reduce GDP proportionally: GDP_new = GDP * (1 - severity_factor)
      - severity_factor depends on how critical the lost resource is to the state's economy
      - Recovery is triggered by queuing an LLM recovery prompt for next tick
    """
    action = intervention.get("action", "")
    target = intervention.get("target", "")
    
    event_log = {
        "type": intervention.get("severity", "danger"),
        "text": intervention.get("description", f"Federal intervention: {action}"),
        "timestamp": datetime.now().isoformat(),
        "tick": sim.tick,
    }

    gdp_impact = {}  # Track GDP changes for broadcast

    if target and target in env.regions_data:
        region = env.regions_data[target]
        resources = region.get("resources", {})
        old_gdp = region.get("gdp_score", 50)

        if action == "drought":
            resources["water"] = max(0, int(resources.get("water", 0) * 0.3))
            # Water scarcity hits agriculture → GDP drops 15-25%
            gdp_penalty = old_gdp * 0.20
            region["gdp_score"] = max(5, old_gdp - gdp_penalty)
            region["welfare_score"] = max(10, region.get("welfare_score", 50) - 12)
            event_log["text"] = f"🏜️ FEDERAL: Drought in {STATE_NAMES.get(target, target)} — Water -70%, GDP -{gdp_penalty:.1f} (now {region['gdp_score']:.1f})"
            gdp_impact[target] = {"before": old_gdp, "after": region["gdp_score"], "change": -gdp_penalty}

        elif action == "flood":
            resources["food"] = max(0, int(resources.get("food", 0) * 0.2))
            resources["water"] = int(resources.get("water", 0) * 1.5)
            # Floods destroy infrastructure → GDP drops 18-28%
            gdp_penalty = old_gdp * 0.23
            region["gdp_score"] = max(5, old_gdp - gdp_penalty)
            region["welfare_score"] = max(10, region.get("welfare_score", 50) - 18)
            event_log["text"] = f"🌊 FEDERAL: Flooding in {STATE_NAMES.get(target, target)} — Food -80%, GDP -{gdp_penalty:.1f} (now {region['gdp_score']:.1f})"
            gdp_impact[target] = {"before": old_gdp, "after": region["gdp_score"], "change": -gdp_penalty}

        elif action == "energy_crisis":
            resources["energy"] = max(0, int(resources.get("energy", 0) * 0.25))
            # Energy collapse shuts factories → GDP drops 22-30%
            gdp_penalty = old_gdp * 0.27
            region["gdp_score"] = max(5, old_gdp - gdp_penalty)
            region["welfare_score"] = max(10, region.get("welfare_score", 50) - 10)
            event_log["text"] = f"⚡ FEDERAL: Grid collapse in {STATE_NAMES.get(target, target)} — Energy -75%, GDP -{gdp_penalty:.1f} (now {region['gdp_score']:.1f})"
            gdp_impact[target] = {"before": old_gdp, "after": region["gdp_score"], "change": -gdp_penalty}

        elif action == "tech_boom":
            resources["tech"] = int(resources.get("tech", 0) * 2.5)
            # Tech boom boosts economy
            gdp_bonus = old_gdp * 0.25
            region["gdp_score"] = old_gdp + gdp_bonus
            region["welfare_score"] = min(100, region.get("welfare_score", 50) + 8)
            event_log["text"] = f"💻 FEDERAL: Tech boom in {STATE_NAMES.get(target, target)} — Tech +150%, GDP +{gdp_bonus:.1f} (now {region['gdp_score']:.1f})"
            event_log["type"] = "success"
            gdp_impact[target] = {"before": old_gdp, "after": region["gdp_score"], "change": gdp_bonus}

        elif action == "health_crisis":
            region["welfare_score"] = max(0, region.get("welfare_score", 50) - 30)
            # Health crisis reduces workforce → GDP drops 12-18%
            gdp_penalty = old_gdp * 0.15
            region["gdp_score"] = max(5, old_gdp - gdp_penalty)
            event_log["text"] = f"🦠 FEDERAL: Health emergency in {STATE_NAMES.get(target, target)} — Welfare -30, GDP -{gdp_penalty:.1f}"
            gdp_impact[target] = {"before": old_gdp, "after": region["gdp_score"], "change": -gdp_penalty}

        elif action == "monsoon_failure":
            resources["water"] = max(0, int(resources.get("water", 0) * 0.15))
            resources["food"] = max(0, int(resources.get("food", 0) * 0.4))
            # Dual resource loss → GDP drops 25-35%
            gdp_penalty = old_gdp * 0.30
            region["gdp_score"] = max(5, old_gdp - gdp_penalty)
            region["welfare_score"] = max(10, region.get("welfare_score", 50) - 20)
            event_log["text"] = f"🌧️ FEDERAL: Monsoon failure in {STATE_NAMES.get(target, target)} — Water -85%, Food -60%, GDP -{gdp_penalty:.1f}"
            gdp_impact[target] = {"before": old_gdp, "after": region["gdp_score"], "change": -gdp_penalty}
        
        region["resources"] = resources

        # ─── AI Recovery: Queue governor response for affected state ────────
        recovery_msg = {
            "state": target,
            "text": f"🚨 CRISIS DETECTED: {action.upper()} — GDP dropped from {old_gdp:.1f} to {region['gdp_score']:.1f}. "
                    f"Initiating emergency recovery: seeking resource trades from neighboring states, "
                    f"activating reserves, requesting federal aid.",
            "type": "recovery",
            "tick": sim.tick,
            "timestamp": datetime.now().isoformat(),
        }
        sim.add_governor_msg(recovery_msg)

    elif action == "gdp_crash":
        for code in env.regions_data:
            old = env.regions_data[code].get("gdp_score", 0)
            env.regions_data[code]["gdp_score"] = max(5, old * 0.7)
            env.regions_data[code]["welfare_score"] = max(10, env.regions_data[code].get("welfare_score", 50) - 8)
            gdp_impact[code] = {"before": old, "after": env.regions_data[code]["gdp_score"], "change": -(old * 0.3)}
        event_log["text"] = "📉 FEDERAL: National GDP crash — All states GDP -30%, Welfare -8"
        # Recovery messages for all states
        for code in env.regions_data:
            sim.add_governor_msg({
                "state": code,
                "text": f"🚨 NATIONAL CRISIS: GDP crashed by 30%. Activating austerity measures and seeking emergency trade agreements.",
                "type": "recovery",
                "tick": sim.tick,
                "timestamp": datetime.now().isoformat(),
            })
    
    elif action == "stimulus":
        for code in env.regions_data:
            old = env.regions_data[code].get("gdp_score", 0)
            env.regions_data[code]["gdp_score"] = old * 1.15
            env.regions_data[code]["welfare_score"] = min(100, env.regions_data[code].get("welfare_score", 50) + 5)
            gdp_impact[code] = {"before": old, "after": env.regions_data[code]["gdp_score"], "change": old * 0.15}
        event_log["text"] = "📈 FEDERAL: National stimulus — All states GDP +15%, Welfare +5"
        event_log["type"] = "success"

    event_log["gdp_impact"] = gdp_impact
    sim.add_climate_event(event_log)
    return event_log


def run_simulation_loop(ticks, use_llm, use_firebase, delay):
    """Main simulation loop running in a background thread."""
    from engine.world_env import WorldEnvironment

    sim.running = True
    env = WorldEnvironment(use_llm=use_llm, firebase_sync=use_firebase)

    # Initialize
    if use_firebase:
        try:
            env.initialize()
        except Exception as e:
            print(f"[API] Firebase init failed: {e}, falling back to seed data")
            use_firebase = False

    if not use_firebase:
        # Build seed data inline to avoid importing seed_firestore.py (which triggers Firebase)
        import copy
        seed_data = {
            "PB": {"name":"Punjab","code":"PB","population":28000000,"gdp_score":55.0,"welfare_score":72.0,
                   "resources":{"water":8000,"energy":3000,"food":15000,"tech":1000},
                   "resource_generation_rates":{"water":-200,"energy":150,"food":800,"tech":50},
                   "resource_consumption_rates":{"water":600,"energy":200,"food":300,"tech":80},
                   "finops_metrics":{"projected_deficit":"water","budget_surplus":2000,"burn_rate":0.12,"revenue_per_tick":3500,"expenditure_per_tick":1500},
                   "demographics":{"workforce_efficiency":0.75,"unrest_level":0.1,"migration_pressure":0.05,"literacy_rate":0.76,"urbanization":0.37},
                   "infrastructure":{"solar_farms":0,"canals":2,"tech_parks":0,"hospitals":1,"roads":3,"power_plants":1},
                   "trust_score":100,"internal_policies":{"food_subsidy":0.15,"water_tax":0.05,"energy_tariff":0.10,"tech_investment":0.05}},
            "MH": {"name":"Maharashtra","code":"MH","population":125000000,"gdp_score":85.4,"welfare_score":65.0,
                   "resources":{"water":4500,"energy":12000,"food":6000,"tech":8000},
                   "resource_generation_rates":{"water":100,"energy":600,"food":200,"tech":400},
                   "resource_consumption_rates":{"water":800,"energy":500,"food":700,"tech":200},
                   "finops_metrics":{"projected_deficit":"water","budget_surplus":5000,"burn_rate":0.08,"revenue_per_tick":8500,"expenditure_per_tick":3500},
                   "demographics":{"workforce_efficiency":0.85,"unrest_level":0.15,"migration_pressure":-0.10,"literacy_rate":0.82,"urbanization":0.52},
                   "infrastructure":{"solar_farms":1,"canals":1,"tech_parks":3,"hospitals":2,"roads":4,"power_plants":3},
                   "trust_score":100,"internal_policies":{"food_subsidy":0.08,"water_tax":0.12,"energy_tariff":0.08,"tech_investment":0.20}},
            "TN": {"name":"Tamil Nadu","code":"TN","population":77000000,"gdp_score":78.0,"welfare_score":70.0,
                   "resources":{"water":3500,"energy":7000,"food":5000,"tech":9000},
                   "resource_generation_rates":{"water":80,"energy":350,"food":250,"tech":500},
                   "resource_consumption_rates":{"water":500,"energy":400,"food":450,"tech":150},
                   "finops_metrics":{"projected_deficit":"water","budget_surplus":3500,"burn_rate":0.09,"revenue_per_tick":7000,"expenditure_per_tick":3500},
                   "demographics":{"workforce_efficiency":0.88,"unrest_level":0.12,"migration_pressure":-0.05,"literacy_rate":0.80,"urbanization":0.48},
                   "infrastructure":{"solar_farms":1,"canals":1,"tech_parks":4,"hospitals":2,"roads":3,"power_plants":2},
                   "trust_score":100,"internal_policies":{"food_subsidy":0.10,"water_tax":0.15,"energy_tariff":0.07,"tech_investment":0.25}},
            "KA": {"name":"Karnataka","code":"KA","population":67000000,"gdp_score":75.0,"welfare_score":68.0,
                   "resources":{"water":5000,"energy":6000,"food":4500,"tech":10000},
                   "resource_generation_rates":{"water":150,"energy":300,"food":200,"tech":550},
                   "resource_consumption_rates":{"water":400,"energy":350,"food":400,"tech":120},
                   "finops_metrics":{"projected_deficit":"food","budget_surplus":4000,"burn_rate":0.07,"revenue_per_tick":7500,"expenditure_per_tick":3500},
                   "demographics":{"workforce_efficiency":0.90,"unrest_level":0.08,"migration_pressure":-0.12,"literacy_rate":0.75,"urbanization":0.42},
                   "infrastructure":{"solar_farms":1,"canals":1,"tech_parks":5,"hospitals":2,"roads":3,"power_plants":2},
                   "trust_score":100,"internal_policies":{"food_subsidy":0.12,"water_tax":0.08,"energy_tariff":0.06,"tech_investment":0.30}},
            "GJ": {"name":"Gujarat","code":"GJ","population":64000000,"gdp_score":72.0,"welfare_score":67.0,
                   "resources":{"water":4000,"energy":11000,"food":5500,"tech":6000},
                   "resource_generation_rates":{"water":120,"energy":550,"food":280,"tech":300},
                   "resource_consumption_rates":{"water":450,"energy":300,"food":380,"tech":150},
                   "finops_metrics":{"projected_deficit":"water","budget_surplus":3800,"burn_rate":0.08,"revenue_per_tick":6500,"expenditure_per_tick":2700},
                   "demographics":{"workforce_efficiency":0.82,"unrest_level":0.07,"migration_pressure":-0.08,"literacy_rate":0.79,"urbanization":0.43},
                   "infrastructure":{"solar_farms":3,"canals":1,"tech_parks":2,"hospitals":2,"roads":4,"power_plants":4},
                   "trust_score":100,"internal_policies":{"food_subsidy":0.08,"water_tax":0.10,"energy_tariff":0.05,"tech_investment":0.15}},
            "UP": {"name":"Uttar Pradesh","code":"UP","population":230000000,"gdp_score":45.0,"welfare_score":48.0,
                   "resources":{"water":7000,"energy":5000,"food":8000,"tech":2000},
                   "resource_generation_rates":{"water":200,"energy":200,"food":400,"tech":80},
                   "resource_consumption_rates":{"water":1200,"energy":800,"food":1500,"tech":300},
                   "finops_metrics":{"projected_deficit":"food","budget_surplus":500,"burn_rate":0.18,"revenue_per_tick":4000,"expenditure_per_tick":3500},
                   "demographics":{"workforce_efficiency":0.55,"unrest_level":0.25,"migration_pressure":0.20,"literacy_rate":0.68,"urbanization":0.22},
                   "infrastructure":{"solar_farms":0,"canals":1,"tech_parks":1,"hospitals":1,"roads":2,"power_plants":2},
                   "trust_score":100,"internal_policies":{"food_subsidy":0.25,"water_tax":0.03,"energy_tariff":0.12,"tech_investment":0.05}},
            "BR": {"name":"Bihar","code":"BR","population":125000000,"gdp_score":25.0,"welfare_score":38.0,
                   "resources":{"water":6000,"energy":2000,"food":4000,"tech":500},
                   "resource_generation_rates":{"water":180,"energy":80,"food":200,"tech":20},
                   "resource_consumption_rates":{"water":700,"energy":400,"food":900,"tech":100},
                   "finops_metrics":{"projected_deficit":"energy","budget_surplus":-200,"burn_rate":0.22,"revenue_per_tick":1500,"expenditure_per_tick":1700},
                   "demographics":{"workforce_efficiency":0.45,"unrest_level":0.30,"migration_pressure":0.35,"literacy_rate":0.62,"urbanization":0.12},
                   "infrastructure":{"solar_farms":0,"canals":0,"tech_parks":0,"hospitals":0,"roads":1,"power_plants":1},
                   "trust_score":100,"internal_policies":{"food_subsidy":0.30,"water_tax":0.02,"energy_tariff":0.15,"tech_investment":0.02}},
            "WB": {"name":"West Bengal","code":"WB","population":100000000,"gdp_score":50.0,"welfare_score":55.0,
                   "resources":{"water":10000,"energy":4000,"food":7000,"tech":3000},
                   "resource_generation_rates":{"water":500,"energy":180,"food":350,"tech":120},
                   "resource_consumption_rates":{"water":600,"energy":350,"food":650,"tech":150},
                   "finops_metrics":{"projected_deficit":"energy","budget_surplus":1200,"burn_rate":0.11,"revenue_per_tick":4500,"expenditure_per_tick":3300},
                   "demographics":{"workforce_efficiency":0.65,"unrest_level":0.18,"migration_pressure":0.08,"literacy_rate":0.77,"urbanization":0.32},
                   "infrastructure":{"solar_farms":0,"canals":3,"tech_parks":1,"hospitals":1,"roads":2,"power_plants":1},
                   "trust_score":100,"internal_policies":{"food_subsidy":0.12,"water_tax":0.03,"energy_tariff":0.10,"tech_investment":0.08}},
            "RJ": {"name":"Rajasthan","code":"RJ","population":79000000,"gdp_score":42.0,"welfare_score":50.0,
                   "resources":{"water":1500,"energy":14000,"food":3000,"tech":2000},
                   "resource_generation_rates":{"water":30,"energy":700,"food":100,"tech":100},
                   "resource_consumption_rates":{"water":500,"energy":200,"food":500,"tech":100},
                   "finops_metrics":{"projected_deficit":"water","budget_surplus":1000,"burn_rate":0.14,"revenue_per_tick":3000,"expenditure_per_tick":2000},
                   "demographics":{"workforce_efficiency":0.60,"unrest_level":0.20,"migration_pressure":0.15,"literacy_rate":0.66,"urbanization":0.25},
                   "infrastructure":{"solar_farms":5,"canals":0,"tech_parks":1,"hospitals":1,"roads":2,"power_plants":1},
                   "trust_score":100,"internal_policies":{"food_subsidy":0.15,"water_tax":0.25,"energy_tariff":0.03,"tech_investment":0.08}},
            "MP": {"name":"Madhya Pradesh","code":"MP","population":85000000,"gdp_score":48.0,"welfare_score":52.0,
                   "resources":{"water":6500,"energy":6000,"food":6500,"tech":3500},
                   "resource_generation_rates":{"water":250,"energy":280,"food":300,"tech":150},
                   "resource_consumption_rates":{"water":500,"energy":350,"food":550,"tech":120},
                   "finops_metrics":{"projected_deficit":None,"budget_surplus":1800,"burn_rate":0.10,"revenue_per_tick":4200,"expenditure_per_tick":2400},
                   "demographics":{"workforce_efficiency":0.62,"unrest_level":0.12,"migration_pressure":0.02,"literacy_rate":0.70,"urbanization":0.28},
                   "infrastructure":{"solar_farms":1,"canals":2,"tech_parks":1,"hospitals":1,"roads":3,"power_plants":2},
                   "trust_score":100,"internal_policies":{"food_subsidy":0.10,"water_tax":0.06,"energy_tariff":0.08,"tech_investment":0.10}},
        }
        env.regions_data = {code: copy.deepcopy(data) for code, data in seed_data.items()}
        print(f"[API] Loaded {len(env.regions_data)} regions from inline seed data (offline)")


    sim.env = env
    print(f"\n[API] Simulation started: {ticks} ticks, LLM={'ON' if use_llm else 'OFF'}, Firebase={'ON' if use_firebase else 'OFF'}")

    for i in range(ticks):
        if not sim.running:
            break

        # Apply any queued interventions BEFORE the tick
        interventions = sim.pop_interventions()
        intervention_events = []
        for intervention in interventions:
            event = apply_intervention(env, intervention)
            intervention_events.append(event)
            print(f"  [INTERVENTION] {event['text']}")

        # Run one tick
        tick_result = env.tick()
        sim.tick = env.current_tick

        # Extract trade events (field name: trades_executed)
        for trade in tick_result.get("trades_executed", []):
            trade_entry = {
                "from": trade.get("from", "??"),
                "to": trade.get("to", "??"),
                "offering": trade.get("offering", trade.get("offered", {})),
                "requesting": trade.get("requesting", trade.get("received", {})),
                "tick": sim.tick,
                "timestamp": datetime.now().isoformat(),
            }
            sim.add_trade(trade_entry)

        # Extract LLM trade actions as governor messages (field name: llm_actions)
        for action in tick_result.get("llm_actions", []):
            proposal = action.get("proposal", {})
            from_code = action.get("from", "??")
            to_code = action.get("to", "??")
            offering = proposal.get("offering", {})
            requesting = proposal.get("requesting", {})
            reasoning = proposal.get("reasoning", "Strategic trade negotiation")

            # Add as governor message
            sim.add_governor_msg({
                "state": from_code,
                "text": f"Negotiated with {STATE_NAMES.get(to_code, to_code)}: offering {offering}, requesting {requesting}. {reasoning}",
                "type": "negotiation",
                "tick": sim.tick,
                "timestamp": datetime.now().isoformat(),
            })

            # Also add as a trade
            sim.add_trade({
                "from": from_code, "to": to_code,
                "offering": offering, "requesting": requesting,
                "tick": sim.tick, "timestamp": datetime.now().isoformat(),
            })

        # Extract climate events
        for evt in tick_result.get("climate_events", []):
            event_type = evt.get("type", "")
            if event_type == "TRIGGERED":
                sim.add_climate_event({
                    "type": "danger",
                    "text": f"Climate: {evt.get('event_id', 'Unknown')} hit {evt.get('target_region', '??')}!",
                    "tick": sim.tick,
                    "timestamp": datetime.now().isoformat(),
                })

        # Build snapshot for broadcast
        snapshot = env.get_state_snapshot()
        sim.latest_snapshot = snapshot
        sim.latest_events = tick_result

        # Build the broadcast payload
        regions_payload = {}
        for code, rdata in snapshot.get("regions", {}).items():
            regions_payload[code] = {
                "name": STATE_NAMES.get(code, code),
                "resources": rdata.get("resources", {}),
                "gdp": rdata.get("gdp_score", 0),
                "welfare": rdata.get("welfare_score", 0),
                "trust": rdata.get("trust_score", 100),
                "population": rdata.get("population", 0),
            }

        # Calculate aggregate stats
        gdp_values = [r["gdp"] for r in regions_payload.values()]
        welfare_values = [r["welfare"] for r in regions_payload.values()]
        total_gdp = sum(gdp_values)
        mean_gdp = total_gdp / len(gdp_values) if gdp_values else 0
        avg_welfare = sum(welfare_values) / len(welfare_values) if welfare_values else 0
        n = len(gdp_values)
        if n > 0 and total_gdp > 0:
            sorted_gdp = sorted(gdp_values)
            cumulative = sum((2 * (i + 1) - n - 1) * val for i, val in enumerate(sorted_gdp))
            gini = cumulative / (n * total_gdp)
        else:
            gini = 0

        # Find highest and lowest GDP regions
        gdp_ranked = sorted(regions_payload.items(), key=lambda x: x[1]["gdp"], reverse=True)
        highest_gdp = {"code": gdp_ranked[0][0], "name": gdp_ranked[0][1]["name"], "gdp": gdp_ranked[0][1]["gdp"]} if gdp_ranked else {}
        lowest_gdp = {"code": gdp_ranked[-1][0], "name": gdp_ranked[-1][1]["name"], "gdp": gdp_ranked[-1][1]["gdp"]} if gdp_ranked else {}
        
        # GDP ranking list
        gdp_ranking = [{"code": c, "name": d["name"], "gdp": round(d["gdp"], 1), "welfare": round(d["welfare"], 1)} for c, d in gdp_ranked]

        broadcast_data = {
            "type": "tick",
            "tick": sim.tick,
            "regions": regions_payload,
            "stats": {
                "total_gdp": round(total_gdp, 2),
                "gini": round(gini, 4),
                "mean_gdp": round(mean_gdp, 2),
                "avg_welfare": round(avg_welfare, 2),
                "highest_gdp": highest_gdp,
                "lowest_gdp": lowest_gdp,
                "gdp_ranking": gdp_ranking,
            },
            "trades": sim.trade_log[:10],
            "governor_messages": sim.governor_log[-10:],
            "climate_events": sim.climate_log[-15:],
            "interventions": intervention_events,
            "tick_summary": {
                "trades_count": len(tick_result.get("trades_executed", [])) + len(tick_result.get("llm_actions", [])),
                "llm_calls": len(tick_result.get("llm_actions", [])),
                "climate_count": len(tick_result.get("climate_events", [])),
                "migration_count": len(tick_result.get("migrations", [])),
            },
        }

        # Broadcast to all connected WebSocket clients
        loop = asyncio.new_event_loop()
        loop.run_until_complete(broadcast(broadcast_data))
        loop.close()

        if delay > 0:
            time.sleep(delay)

    sim.running = False
    print(f"\n[API] Simulation complete after {sim.tick} ticks")


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "WORLDSIM API running", "tick": sim.tick, "running": sim.running}


@app.get("/api/state")
async def get_state():
    """Return the current simulation snapshot."""
    if not sim.latest_snapshot:
        return JSONResponse({"error": "Simulation not started"}, status_code=503)
    
    regions_payload = {}
    for code, rdata in sim.latest_snapshot.get("regions", {}).items():
        regions_payload[code] = {
            "name": STATE_NAMES.get(code, code),
            "resources": rdata.get("resources", {}),
            "gdp": rdata.get("gdp_score", 0),
            "welfare": rdata.get("welfare_score", 0),
            "trust": rdata.get("trust_score", 100),
            "population": rdata.get("population", 0),
        }

    return {
        "tick": sim.tick,
        "running": sim.running,
        "regions": regions_payload,
        "trades": sim.trade_log[:20],
        "governor_messages": sim.governor_log[-20:],
        "climate_events": sim.climate_log[-20:],
    }


@app.get("/api/csv/gdp-history")
async def csv_gdp_history():
    """GDP per state over ticks (for line chart)."""
    from csv_data_loader import get_store
    return get_store().get_gdp_history()


@app.get("/api/csv/welfare-history")
async def csv_welfare_history():
    """Welfare per state over ticks (for line chart)."""
    from csv_data_loader import get_store
    return get_store().get_welfare_history()


@app.get("/api/csv/trades")
async def csv_trades():
    """Recent executed trades from CSV (for trade log)."""
    from csv_data_loader import get_store
    return get_store().get_all_trades(limit=300)


@app.get("/api/csv/overview")
async def csv_overview():
    """State-level resource snapshot (for bar charts)."""
    from csv_data_loader import get_store
    return get_store().get_resource_overview()


@app.get("/api/csv/trade-volume")
async def csv_trade_volume():
    """Trade volume by resource type."""
    from csv_data_loader import get_store
    return get_store().get_trade_volume_by_resource()


@app.get("/api/csv/climate-summary")
async def csv_climate_summary():
    """Climate event counts by type."""
    from csv_data_loader import get_store
    return get_store().get_climate_summary()


@app.get("/api/csv/trade-activity")
async def csv_trade_activity():
    """Trade count per state (bids vs asks)."""
    from csv_data_loader import get_store
    return get_store().get_state_trade_activity()


@app.post("/api/intervene")
async def intervene(body: dict):
    """Queue a federal intervention to be applied on the next tick."""
    action = body.get("action", "")
    target = body.get("target", "")
    
    valid_actions = [
        "drought", "flood", "energy_crisis", "tech_boom",
        "health_crisis", "monsoon_failure", "gdp_crash", "stimulus"
    ]
    
    if action not in valid_actions:
        return JSONResponse({"error": f"Invalid action. Must be one of: {valid_actions}"}, status_code=400)
    
    intervention = {
        "action": action,
        "target": target,
        "severity": body.get("severity", "danger"),
        "description": body.get("description", ""),
        "timestamp": datetime.now().isoformat(),
    }
    
    sim.queue_intervention(intervention)
    return {"status": "queued", "intervention": intervention, "queue_size": len(sim.intervention_queue)}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time simulation data streaming."""
    await websocket.accept()
    connected_clients.add(websocket)
    print(f"[WS] Client connected ({len(connected_clients)} total)")

    # Send current state immediately
    if sim.latest_snapshot:
        try:
            await websocket.send_json({
                "type": "init",
                "tick": sim.tick,
                "running": sim.running,
            })
        except Exception:
            pass

    try:
        while True:
            # Listen for messages from client (interventions)
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "intervene":
                    sim.queue_intervention(msg.get("payload", {}))
                    await websocket.send_json({"type": "intervention_ack", "status": "queued"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        connected_clients.discard(websocket)
        print(f"[WS] Client disconnected ({len(connected_clients)} total)")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="WORLDSIM API Server")
    parser.add_argument("--ticks", type=int, default=200, help="Simulation ticks")
    parser.add_argument("--delay", type=float, default=2.0, help="Seconds between ticks")
    parser.add_argument("--no-llm", action="store_true", help="Disable LLM")
    parser.add_argument("--no-firebase", action="store_true", help="Disable Firebase")
    parser.add_argument("--port", type=int, default=8000, help="API port")
    args = parser.parse_args()

    use_llm = not args.no_llm
    use_firebase = not args.no_firebase

    # Pre-flight checks
    if use_llm:
        print(f"[API] Checking Ollama at {OLLAMA_BASE_URL}...")
        try:
            from agents.ollama_client import get_ollama_client
            client = get_ollama_client()
            if not client.is_healthy():
                print("[API] Ollama not running — falling back to Quant-only mode")
                use_llm = False
            else:
                print(f"[API] Ollama ready with model: {OLLAMA_MODEL}")
        except Exception as e:
            print(f"[API] Ollama check failed: {e} — falling back to Quant-only mode")
            use_llm = False

    if use_firebase:
        try:
            from firebase_config import initialize_firebase
            initialize_firebase()
            print("[API] Firebase connected")
        except Exception as e:
            print(f"[API] Firebase failed: {e} — running offline")
            use_firebase = False

    # Start simulation in background thread
    sim_thread = threading.Thread(
        target=run_simulation_loop,
        args=(args.ticks, use_llm, use_firebase, args.delay),
        daemon=True,
    )
    sim_thread.start()

    # Start API server
    print(f"\n[API] Server starting on http://localhost:{args.port}")
    print(f"[API] WebSocket: ws://localhost:{args.port}/ws")
    print(f"[API] Dashboard: Open http://localhost:5174 in your browser\n")
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
