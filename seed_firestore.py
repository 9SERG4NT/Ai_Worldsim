"""
WORLDSIM: India Ecosystem — Firestore Seed Script
Deletes ALL existing data and seeds the full WORLDSIM schema.

Usage:
    python seed_firestore.py
"""

import sys
import time
from datetime import datetime, timezone
from firebase_config import initialize_firebase
from google.cloud.firestore_v1.base_query import FieldFilter

# ─── Initialize Firebase ─────────────────────────────────────────────────────

db = initialize_firebase()

# ─── Constants ────────────────────────────────────────────────────────────────

COLLECTIONS_TO_DELETE = [
    "simulation_state",
    "regions",
    "trade_hub",
    "federal_assembly_logs",
    "climate_events",
]

# ─── 10 Indian States: Initial Seed Data ──────────────────────────────────────

REGIONS_DATA = {
    "PB": {
        "name": "Punjab",
        "code": "PB",
        "population": 28000000,
        "gdp_score": 55.0,
        "welfare_score": 72.0,
        "resources": {
            "water": 8000,
            "energy": 3000,
            "food": 15000,
            "tech": 1000,
        },
        "resource_generation_rates": {
            "water": -200,  # High drain due to agriculture
            "energy": 150,
            "food": 800,    # Major food producer
            "tech": 50,
        },
        "resource_consumption_rates": {
            "water": 600,
            "energy": 200,
            "food": 300,
            "tech": 80,
        },
        "finops_metrics": {
            "projected_deficit": "water",
            "budget_surplus": 2000,
            "burn_rate": 0.12,
            "revenue_per_tick": 3500,
            "expenditure_per_tick": 1500,
        },
        "demographics": {
            "workforce_efficiency": 0.75,
            "unrest_level": 0.1,
            "migration_pressure": 0.05,
            "literacy_rate": 0.76,
            "urbanization": 0.37,
        },
        "infrastructure": {
            "solar_farms": 0,
            "canals": 2,
            "tech_parks": 0,
            "hospitals": 1,
            "roads": 3,
            "power_plants": 1,
        },
        "rl_state_vector": [],
        "active_treaties": [],
        "trust_score": 100,
        "internal_policies": {
            "food_subsidy": 0.15,
            "water_tax": 0.05,
            "energy_tariff": 0.10,
            "tech_investment": 0.05,
        },
        "specialization": "High Food Production, High Water Drain (Agriculture)",
    },
    "MH": {
        "name": "Maharashtra",
        "code": "MH",
        "population": 125000000,
        "gdp_score": 85.4,
        "welfare_score": 65.0,
        "resources": {
            "water": 4500,
            "energy": 12000,
            "food": 6000,
            "tech": 8000,
        },
        "resource_generation_rates": {
            "water": 100,
            "energy": 600,
            "food": 200,
            "tech": 400,
        },
        "resource_consumption_rates": {
            "water": 800,
            "energy": 500,
            "food": 700,
            "tech": 200,
        },
        "finops_metrics": {
            "projected_deficit": "water",
            "budget_surplus": 5000,
            "burn_rate": 0.08,
            "revenue_per_tick": 8500,
            "expenditure_per_tick": 3500,
        },
        "demographics": {
            "workforce_efficiency": 0.85,
            "unrest_level": 0.15,
            "migration_pressure": -0.10,  # Attracts migration
            "literacy_rate": 0.82,
            "urbanization": 0.52,
        },
        "infrastructure": {
            "solar_farms": 1,
            "canals": 1,
            "tech_parks": 3,
            "hospitals": 2,
            "roads": 4,
            "power_plants": 3,
        },
        "rl_state_vector": [],
        "active_treaties": [],
        "trust_score": 100,
        "internal_policies": {
            "food_subsidy": 0.08,
            "water_tax": 0.12,
            "energy_tariff": 0.08,
            "tech_investment": 0.20,
        },
        "specialization": "High Energy, High GDP, High Tech, Water Deficit",
    },
    "TN": {
        "name": "Tamil Nadu",
        "code": "TN",
        "population": 77000000,
        "gdp_score": 78.0,
        "welfare_score": 70.0,
        "resources": {
            "water": 3500,
            "energy": 7000,
            "food": 5000,
            "tech": 9000,
        },
        "resource_generation_rates": {
            "water": 80,   # Variable — monsoon dependent
            "energy": 350,
            "food": 250,
            "tech": 500,
        },
        "resource_consumption_rates": {
            "water": 500,
            "energy": 400,
            "food": 450,
            "tech": 150,
        },
        "finops_metrics": {
            "projected_deficit": "water",
            "budget_surplus": 3500,
            "burn_rate": 0.09,
            "revenue_per_tick": 7000,
            "expenditure_per_tick": 3500,
        },
        "demographics": {
            "workforce_efficiency": 0.88,
            "unrest_level": 0.12,
            "migration_pressure": -0.05,
            "literacy_rate": 0.80,
            "urbanization": 0.48,
        },
        "infrastructure": {
            "solar_farms": 1,
            "canals": 1,
            "tech_parks": 4,
            "hospitals": 2,
            "roads": 3,
            "power_plants": 2,
        },
        "rl_state_vector": [],
        "active_treaties": [],
        "trust_score": 100,
        "internal_policies": {
            "food_subsidy": 0.10,
            "water_tax": 0.15,
            "energy_tariff": 0.07,
            "tech_investment": 0.25,
        },
        "specialization": "High Tech/GDP, Variable Water (Monsoon-Dependent)",
    },
    "KA": {
        "name": "Karnataka",
        "code": "KA",
        "population": 67000000,
        "gdp_score": 75.0,
        "welfare_score": 68.0,
        "resources": {
            "water": 5000,
            "energy": 6000,
            "food": 4500,
            "tech": 10000,
        },
        "resource_generation_rates": {
            "water": 150,
            "energy": 300,
            "food": 200,
            "tech": 550,  # Bangalore tech hub
        },
        "resource_consumption_rates": {
            "water": 400,
            "energy": 350,
            "food": 400,
            "tech": 120,
        },
        "finops_metrics": {
            "projected_deficit": "food",
            "budget_surplus": 4000,
            "burn_rate": 0.07,
            "revenue_per_tick": 7500,
            "expenditure_per_tick": 3500,
        },
        "demographics": {
            "workforce_efficiency": 0.90,
            "unrest_level": 0.08,
            "migration_pressure": -0.12,  # Strong attractor (Bangalore)
            "literacy_rate": 0.75,
            "urbanization": 0.42,
        },
        "infrastructure": {
            "solar_farms": 1,
            "canals": 1,
            "tech_parks": 5,
            "hospitals": 2,
            "roads": 3,
            "power_plants": 2,
        },
        "rl_state_vector": [],
        "active_treaties": [],
        "trust_score": 100,
        "internal_policies": {
            "food_subsidy": 0.12,
            "water_tax": 0.08,
            "energy_tariff": 0.06,
            "tech_investment": 0.30,
        },
        "specialization": "Highest Tech (Bangalore Hub), Moderate Food Deficit",
    },
    "GJ": {
        "name": "Gujarat",
        "code": "GJ",
        "population": 64000000,
        "gdp_score": 72.0,
        "welfare_score": 67.0,
        "resources": {
            "water": 4000,
            "energy": 11000,
            "food": 5500,
            "tech": 6000,
        },
        "resource_generation_rates": {
            "water": 120,
            "energy": 550,  # Petrochemical + Solar
            "food": 280,
            "tech": 300,
        },
        "resource_consumption_rates": {
            "water": 450,
            "energy": 300,
            "food": 380,
            "tech": 150,
        },
        "finops_metrics": {
            "projected_deficit": "water",
            "budget_surplus": 3800,
            "burn_rate": 0.08,
            "revenue_per_tick": 6500,
            "expenditure_per_tick": 2700,
        },
        "demographics": {
            "workforce_efficiency": 0.82,
            "unrest_level": 0.07,
            "migration_pressure": -0.08,
            "literacy_rate": 0.79,
            "urbanization": 0.43,
        },
        "infrastructure": {
            "solar_farms": 3,
            "canals": 1,
            "tech_parks": 2,
            "hospitals": 2,
            "roads": 4,
            "power_plants": 4,
        },
        "rl_state_vector": [],
        "active_treaties": [],
        "trust_score": 100,
        "internal_policies": {
            "food_subsidy": 0.08,
            "water_tax": 0.10,
            "energy_tariff": 0.05,
            "tech_investment": 0.15,
        },
        "specialization": "High Energy (Petro + Solar), High Trade Capacity",
    },
    "UP": {
        "name": "Uttar Pradesh",
        "code": "UP",
        "population": 230000000,
        "gdp_score": 45.0,
        "welfare_score": 48.0,
        "resources": {
            "water": 7000,
            "energy": 5000,
            "food": 8000,
            "tech": 2000,
        },
        "resource_generation_rates": {
            "water": 200,
            "energy": 200,
            "food": 400,
            "tech": 80,
        },
        "resource_consumption_rates": {
            "water": 1200,  # Massive population drain
            "energy": 800,
            "food": 1500,   # Massive food demand
            "tech": 300,
        },
        "finops_metrics": {
            "projected_deficit": "food",
            "budget_surplus": 500,
            "burn_rate": 0.18,
            "revenue_per_tick": 4000,
            "expenditure_per_tick": 3500,
        },
        "demographics": {
            "workforce_efficiency": 0.55,
            "unrest_level": 0.25,
            "migration_pressure": 0.20,  # Pushes out migration
            "literacy_rate": 0.68,
            "urbanization": 0.22,
        },
        "infrastructure": {
            "solar_farms": 0,
            "canals": 1,
            "tech_parks": 1,
            "hospitals": 1,
            "roads": 2,
            "power_plants": 2,
        },
        "rl_state_vector": [],
        "active_treaties": [],
        "trust_score": 100,
        "internal_policies": {
            "food_subsidy": 0.25,
            "water_tax": 0.03,
            "energy_tariff": 0.12,
            "tech_investment": 0.05,
        },
        "specialization": "Highest Population, Highest Food Demand, Resource Strain",
    },
    "BR": {
        "name": "Bihar",
        "code": "BR",
        "population": 125000000,
        "gdp_score": 25.0,
        "welfare_score": 38.0,
        "resources": {
            "water": 6000,
            "energy": 2000,
            "food": 4000,
            "tech": 500,
        },
        "resource_generation_rates": {
            "water": 180,
            "energy": 80,
            "food": 200,
            "tech": 20,
        },
        "resource_consumption_rates": {
            "water": 700,
            "energy": 400,
            "food": 900,
            "tech": 100,
        },
        "finops_metrics": {
            "projected_deficit": "energy",
            "budget_surplus": -200,  # Running a deficit
            "burn_rate": 0.22,
            "revenue_per_tick": 1500,
            "expenditure_per_tick": 1700,
        },
        "demographics": {
            "workforce_efficiency": 0.45,
            "unrest_level": 0.30,
            "migration_pressure": 0.35,  # Highest out-migration
            "literacy_rate": 0.62,
            "urbanization": 0.12,
        },
        "infrastructure": {
            "solar_farms": 0,
            "canals": 0,
            "tech_parks": 0,
            "hospitals": 0,
            "roads": 1,
            "power_plants": 1,
        },
        "rl_state_vector": [],
        "active_treaties": [],
        "trust_score": 100,
        "internal_policies": {
            "food_subsidy": 0.30,
            "water_tax": 0.02,
            "energy_tariff": 0.15,
            "tech_investment": 0.02,
        },
        "specialization": "High Population, Lowest Infrastructure, Budget Deficit",
    },
    "WB": {
        "name": "West Bengal",
        "code": "WB",
        "population": 100000000,
        "gdp_score": 50.0,
        "welfare_score": 55.0,
        "resources": {
            "water": 10000,  # Ganges delta — highest water
            "energy": 4000,
            "food": 7000,
            "tech": 3000,
        },
        "resource_generation_rates": {
            "water": 500,   # Abundant water generation
            "energy": 180,
            "food": 350,
            "tech": 120,
        },
        "resource_consumption_rates": {
            "water": 600,
            "energy": 350,
            "food": 650,
            "tech": 150,
        },
        "finops_metrics": {
            "projected_deficit": "energy",
            "budget_surplus": 1200,
            "burn_rate": 0.11,
            "revenue_per_tick": 4500,
            "expenditure_per_tick": 3300,
        },
        "demographics": {
            "workforce_efficiency": 0.65,
            "unrest_level": 0.18,
            "migration_pressure": 0.08,
            "literacy_rate": 0.77,
            "urbanization": 0.32,
        },
        "infrastructure": {
            "solar_farms": 0,
            "canals": 3,
            "tech_parks": 1,
            "hospitals": 1,
            "roads": 2,
            "power_plants": 1,
        },
        "rl_state_vector": [],
        "active_treaties": [],
        "trust_score": 100,
        "internal_policies": {
            "food_subsidy": 0.12,
            "water_tax": 0.03,
            "energy_tariff": 0.10,
            "tech_investment": 0.08,
        },
        "specialization": "Highest Water (Ganges Delta), Moderate Food, Cyclone Vulnerable",
    },
    "RJ": {
        "name": "Rajasthan",
        "code": "RJ",
        "population": 79000000,
        "gdp_score": 42.0,
        "welfare_score": 50.0,
        "resources": {
            "water": 1500,   # Extreme low water — desert
            "energy": 14000,  # Highest solar energy
            "food": 3000,
            "tech": 2000,
        },
        "resource_generation_rates": {
            "water": 30,    # Almost no water generation
            "energy": 700,  # Massive solar generation
            "food": 100,
            "tech": 100,
        },
        "resource_consumption_rates": {
            "water": 500,
            "energy": 200,
            "food": 500,
            "tech": 100,
        },
        "finops_metrics": {
            "projected_deficit": "water",
            "budget_surplus": 1000,
            "burn_rate": 0.14,
            "revenue_per_tick": 3000,
            "expenditure_per_tick": 2000,
        },
        "demographics": {
            "workforce_efficiency": 0.60,
            "unrest_level": 0.20,
            "migration_pressure": 0.15,
            "literacy_rate": 0.66,
            "urbanization": 0.25,
        },
        "infrastructure": {
            "solar_farms": 5,   # Most solar farms
            "canals": 0,
            "tech_parks": 1,
            "hospitals": 1,
            "roads": 2,
            "power_plants": 1,
        },
        "rl_state_vector": [],
        "active_treaties": [],
        "trust_score": 100,
        "internal_policies": {
            "food_subsidy": 0.15,
            "water_tax": 0.25,  # Highest water tax (scarcity)
            "energy_tariff": 0.03,
            "tech_investment": 0.08,
        },
        "specialization": "Highest Solar Energy, Extreme Water Scarcity (Desert)",
    },
    "MP": {
        "name": "Madhya Pradesh",
        "code": "MP",
        "population": 85000000,
        "gdp_score": 48.0,
        "welfare_score": 52.0,
        "resources": {
            "water": 6500,
            "energy": 6000,
            "food": 6500,
            "tech": 3500,
        },
        "resource_generation_rates": {
            "water": 250,
            "energy": 280,
            "food": 300,
            "tech": 150,
        },
        "resource_consumption_rates": {
            "water": 500,
            "energy": 350,
            "food": 550,
            "tech": 120,
        },
        "finops_metrics": {
            "projected_deficit": None,  # Balanced — no immediate deficit
            "budget_surplus": 1800,
            "burn_rate": 0.10,
            "revenue_per_tick": 4200,
            "expenditure_per_tick": 2400,
        },
        "demographics": {
            "workforce_efficiency": 0.62,
            "unrest_level": 0.12,
            "migration_pressure": 0.02,  # Neutral
            "literacy_rate": 0.70,
            "urbanization": 0.28,
        },
        "infrastructure": {
            "solar_farms": 1,
            "canals": 2,
            "tech_parks": 1,
            "hospitals": 1,
            "roads": 3,
            "power_plants": 2,
        },
        "rl_state_vector": [],
        "active_treaties": [],
        "trust_score": 100,
        "internal_policies": {
            "food_subsidy": 0.10,
            "water_tax": 0.06,
            "energy_tariff": 0.08,
            "tech_investment": 0.10,
        },
        "specialization": "Balanced Central Hub — Strategic Trade Position",
    },
}

# ─── Climate Event Templates ─────────────────────────────────────────────────

CLIMATE_EVENTS = {
    "Drought_RJ": {
        "name": "Thar Desert Drought",
        "type": "drought",
        "target_region": "RJ",
        "severity": "critical",
        "resource_impact": {
            "water": -0.50,  # Wipes 50% water
        },
        "duration_ticks": 10,
        "description": "Severe drought hits Rajasthan. Water reserves depleted by 50%.",
        "recovery_rate": 0.05,
    },
    "Cyclone_WB": {
        "name": "Bay of Bengal Cyclone",
        "type": "cyclone",
        "target_region": "WB",
        "severity": "severe",
        "resource_impact": {
            "food": -0.30,   # Wipes 30% food
        },
        "infrastructure_impact": {
            "roads": -1,
            "hospitals": -1,
        },
        "duration_ticks": 8,
        "description": "Category 4 cyclone devastates West Bengal coast. Food reserves and infrastructure damaged.",
        "recovery_rate": 0.08,
    },
    "Flood_BR": {
        "name": "Bihar Monsoon Floods",
        "type": "flood",
        "target_region": "BR",
        "severity": "severe",
        "resource_impact": {
            "food": -0.40,   # Wipes 40% food
        },
        "duration_ticks": 6,
        "description": "Catastrophic monsoon flooding wipes out 40% of Bihar's food reserves.",
        "recovery_rate": 0.10,
    },
    "Heatwave_UP": {
        "name": "Northern Plains Heatwave",
        "type": "heatwave",
        "target_region": "UP",
        "severity": "moderate",
        "resource_impact": {
            "water": -0.25,
            "energy": -0.15,
        },
        "duration_ticks": 5,
        "description": "Extreme heatwave across UP drains water and overwhelms energy grid.",
        "recovery_rate": 0.12,
    },
    "Monsoon_Failure_TN": {
        "name": "Tamil Nadu Northeast Monsoon Failure",
        "type": "drought",
        "target_region": "TN",
        "severity": "critical",
        "resource_impact": {
            "water": -0.45,
        },
        "duration_ticks": 12,
        "description": "Northeast monsoon fails completely. Tamil Nadu faces acute water crisis.",
        "recovery_rate": 0.04,
    },
    "Industrial_Accident_GJ": {
        "name": "Gujarat Industrial Disaster",
        "type": "industrial",
        "target_region": "GJ",
        "severity": "moderate",
        "resource_impact": {
            "energy": -0.20,
        },
        "infrastructure_impact": {
            "power_plants": -1,
        },
        "duration_ticks": 7,
        "description": "Major industrial accident damages Gujarat's energy infrastructure.",
        "recovery_rate": 0.10,
    },
    "Kaveri_Dispute_KA_TN": {
        "name": "Kaveri River Water Dispute",
        "type": "political",
        "target_region": "KA",
        "secondary_region": "TN",
        "severity": "moderate",
        "resource_impact": {
            "water": -0.15,
        },
        "duration_ticks": 15,
        "description": "Political dispute over Kaveri river water sharing affects both Karnataka and Tamil Nadu.",
        "recovery_rate": 0.03,
    },
}


# ─── Helper Functions ─────────────────────────────────────────────────────────


def delete_collection(collection_ref, batch_size=100):
    """Recursively delete all documents in a collection."""
    docs = collection_ref.limit(batch_size).stream()
    deleted = 0

    for doc in docs:
        # Delete subcollections first
        for subcol in doc.reference.collections():
            delete_collection(subcol, batch_size)
        doc.reference.delete()
        deleted += 1

    if deleted >= batch_size:
        return delete_collection(collection_ref, batch_size)

    return deleted


def delete_all_existing_data():
    """Delete all existing data from WORLDSIM collections."""
    print("\n🗑️  Deleting existing data...")
    for collection_name in COLLECTIONS_TO_DELETE:
        col_ref = db.collection(collection_name)
        count = delete_collection(col_ref)
        print(f"   ├── Deleted {count} documents from '{collection_name}'")
    print("   └── ✅ All existing data deleted.\n")


def seed_simulation_state():
    """Seed the simulation_state collection."""
    print("📊 Seeding simulation_state...")
    db.collection("simulation_state").document("current").set({
        "current_tick": 0,
        "global_gdp": 0,
        "gini_coefficient": 0.0,
        "active_climatic_events": [],
        "federal_policies": [],
        "simulation_status": "initialized",
        "created_at": datetime.now(timezone.utc),
        "last_updated": datetime.now(timezone.utc),
        "total_regions": 10,
        "reward_lambda": 0.5,  # Inequality penalty weight
    })
    print("   └── ✅ simulation_state/current created.\n")


def seed_regions():
    """Seed the regions collection with all 10 Indian states."""
    print("🏛️  Seeding regions (10 Indian states)...")
    batch = db.batch()

    for code, data in REGIONS_DATA.items():
        data["created_at"] = datetime.now(timezone.utc)
        data["last_updated"] = datetime.now(timezone.utc)
        doc_ref = db.collection("regions").document(code)
        batch.set(doc_ref, data)
        print(f"   ├── {code}: {data['name']} (Pop: {data['population']:,}, "
              f"GDP: {data['gdp_score']}, "
              f"💧{data['resources']['water']} "
              f"⚡{data['resources']['energy']} "
              f"🌾{data['resources']['food']} "
              f"💻{data['resources']['tech']})")

    batch.commit()
    print("   └── ✅ All 10 regions seeded.\n")


def seed_trade_hub():
    """Seed the trade_hub collection."""
    print("🏪 Seeding trade_hub...")
    db.collection("trade_hub").document("state").set({
        "order_counter": 0,
        "total_volume_traded": 0,
        "total_trades_executed": 0,
        "created_at": datetime.now(timezone.utc),
        "last_updated": datetime.now(timezone.utc),
    })
    print("   └── ✅ trade_hub/state created (empty order book).\n")


def seed_climate_events():
    """Seed the climate_events collection with disaster templates."""
    print("🌪️  Seeding climate_events...")
    batch = db.batch()

    for event_id, event_data in CLIMATE_EVENTS.items():
        event_data["created_at"] = datetime.now(timezone.utc)
        event_data["is_active"] = False
        event_data["times_triggered"] = 0
        doc_ref = db.collection("climate_events").document(event_id)
        batch.set(doc_ref, event_data)
        print(f"   ├── {event_id}: {event_data['name']} "
              f"({event_data['severity']}, Target: {event_data['target_region']})")

    batch.commit()
    print("   └── ✅ All climate event templates seeded.\n")


def seed_federal_assembly():
    """Initialize the federal_assembly_logs collection."""
    print("🏛️  Initializing federal_assembly_logs...")
    db.collection("federal_assembly_logs").document("metadata").set({
        "total_meetings": 0,
        "total_resolutions_passed": 0,
        "meeting_interval_ticks": 50,
        "created_at": datetime.now(timezone.utc),
    })
    print("   └── ✅ federal_assembly_logs/metadata created.\n")


def print_summary():
    """Print a summary of the seeded data."""
    print("=" * 70)
    print("  🌏  WORLDSIM: India Ecosystem — Firebase Initialized!")
    print("=" * 70)
    print(f"  {'Project:':<20} amar-swaroop-db")
    print(f"  {'Regions:':<20} 10 Indian States")
    print(f"  {'Climate Events:':<20} {len(CLIMATE_EVENTS)} templates")
    print(f"  {'Simulation Tick:':<20} 0 (ready to start)")
    print()
    print("  📋 Collections Created:")
    print("     ├── simulation_state  (global sim state)")
    print("     ├── regions           (10 state documents)")
    print("     ├── trade_hub         (order book)")
    print("     ├── climate_events    (disaster templates)")
    print("     └── federal_assembly_logs (assembly metadata)")
    print()
    print("  🔗 View in Console:")
    print("     https://console.firebase.google.com/project/amar-swaroop-db/firestore")
    print("=" * 70)


# ─── Main Execution ──────────────────────────────────────────────────────────

def main():
    print("\n" + "=" * 70)
    print("  🌏  WORLDSIM: India Ecosystem — Firestore Seed Script")
    print("=" * 70)
    print(f"  Target Project: amar-swaroop-db")
    print(f"  Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 70)

    # Step 1: Delete existing data
    delete_all_existing_data()

    # Step 2: Seed all collections
    seed_simulation_state()
    seed_regions()
    seed_trade_hub()
    seed_climate_events()
    seed_federal_assembly()

    # Step 3: Print summary
    print_summary()


if __name__ == "__main__":
    main()
