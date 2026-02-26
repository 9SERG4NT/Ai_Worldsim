"""
WORLDSIM: India Ecosystem — Firebase Verification Script
Verifies that Firestore has been properly seeded with all required data.

Usage:
    python verify_firebase.py
"""

from firebase_config import initialize_firebase
from tabulate import tabulate

db = initialize_firebase()


def verify_simulation_state():
    """Verify the simulation_state collection."""
    print("\n📊 Verifying simulation_state...")
    doc = db.collection("simulation_state").document("current").get()

    if not doc.exists:
        print("   ❌ simulation_state/current NOT FOUND!")
        return False

    data = doc.to_dict()
    required_fields = [
        "current_tick", "global_gdp", "gini_coefficient",
        "active_climatic_events", "federal_policies",
        "simulation_status", "total_regions", "reward_lambda",
    ]

    missing = [f for f in required_fields if f not in data]
    if missing:
        print(f"   ❌ Missing fields: {missing}")
        return False

    print(f"   ├── Tick: {data['current_tick']}")
    print(f"   ├── Status: {data['simulation_status']}")
    print(f"   ├── Total Regions: {data['total_regions']}")
    print(f"   ├── Reward Lambda: {data['reward_lambda']}")
    print(f"   └── ✅ simulation_state verified.")
    return True


def verify_regions():
    """Verify the regions collection has all 10 states with correct fields."""
    print("\n🏛️  Verifying regions...")
    expected_codes = {"PB", "MH", "TN", "KA", "GJ", "UP", "BR", "WB", "RJ", "MP"}
    regions = {}

    for doc in db.collection("regions").stream():
        regions[doc.id] = doc.to_dict()

    found_codes = set(regions.keys())
    missing = expected_codes - found_codes
    extra = found_codes - expected_codes

    if missing:
        print(f"   ❌ Missing regions: {missing}")
        return False
    if extra:
        print(f"   ⚠️  Extra regions: {extra}")

    # Build summary table
    table_data = []
    for code in sorted(expected_codes):
        r = regions[code]
        res = r.get("resources", {})
        table_data.append([
            code,
            r.get("name", "?"),
            f"{r.get('population', 0):,}",
            r.get("gdp_score", 0),
            r.get("welfare_score", 0),
            res.get("water", 0),
            res.get("energy", 0),
            res.get("food", 0),
            res.get("tech", 0),
            r.get("trust_score", 0),
            r.get("specialization", "")[:40],
        ])

    headers = ["Code", "State", "Population", "GDP", "Welfare",
               "💧Water", "⚡Energy", "🌾Food", "💻Tech", "Trust", "Specialization"]
    print(tabulate(table_data, headers=headers, tablefmt="grid"))

    # Verify each region has required nested fields
    required_nested = [
        "resources", "resource_generation_rates", "resource_consumption_rates",
        "finops_metrics", "demographics", "infrastructure",
        "internal_policies", "rl_state_vector", "active_treaties", "trust_score",
    ]

    all_valid = True
    for code, data in regions.items():
        missing_fields = [f for f in required_nested if f not in data]
        if missing_fields:
            print(f"   ❌ {code}: Missing fields: {missing_fields}")
            all_valid = False

    if all_valid:
        print(f"\n   └── ✅ All 10 regions verified with complete schema.\n")
    return all_valid


def verify_trade_hub():
    """Verify the trade_hub collection."""
    print("🏪 Verifying trade_hub...")
    doc = db.collection("trade_hub").document("state").get()

    if not doc.exists:
        print("   ❌ trade_hub/state NOT FOUND!")
        return False

    data = doc.to_dict()
    print(f"   ├── Order Counter: {data.get('order_counter', 'N/A')}")
    print(f"   ├── Total Volume Traded: {data.get('total_volume_traded', 'N/A')}")
    print(f"   └── ✅ trade_hub verified.\n")
    return True


def verify_climate_events():
    """Verify the climate_events collection."""
    print("🌪️  Verifying climate_events...")
    events = {}
    for doc in db.collection("climate_events").stream():
        events[doc.id] = doc.to_dict()

    if len(events) < 5:
        print(f"   ❌ Expected at least 5 climate events, found {len(events)}")
        return False

    for eid, edata in events.items():
        severity_icon = {"critical": "🔴", "severe": "🟠", "moderate": "🟡"}.get(
            edata.get("severity", ""), "⚪"
        )
        print(f"   ├── {severity_icon} {eid}: {edata.get('name', '?')} "
              f"→ {edata.get('target_region', '?')}")

    print(f"   └── ✅ {len(events)} climate events verified.\n")
    return True


def verify_federal_assembly():
    """Verify the federal_assembly_logs collection."""
    print("🏛️  Verifying federal_assembly_logs...")
    doc = db.collection("federal_assembly_logs").document("metadata").get()

    if not doc.exists:
        print("   ❌ federal_assembly_logs/metadata NOT FOUND!")
        return False

    data = doc.to_dict()
    print(f"   ├── Total Meetings: {data.get('total_meetings', 'N/A')}")
    print(f"   ├── Meeting Interval: Every {data.get('meeting_interval_ticks', 'N/A')} ticks")
    print(f"   └── ✅ federal_assembly_logs verified.\n")
    return True


def main():
    print("\n" + "=" * 70)
    print("  🌏  WORLDSIM: India Ecosystem — Firebase Verification")
    print("=" * 70)

    results = {
        "simulation_state": verify_simulation_state(),
        "regions": verify_regions(),
        "trade_hub": verify_trade_hub(),
        "climate_events": verify_climate_events(),
        "federal_assembly_logs": verify_federal_assembly(),
    }

    print("=" * 70)
    all_passed = all(results.values())
    if all_passed:
        print("  ✅  ALL CHECKS PASSED — Firebase is ready for WORLDSIM!")
    else:
        failed = [k for k, v in results.items() if not v]
        print(f"  ❌  FAILED: {', '.join(failed)}")
    print("=" * 70)

    return all_passed


if __name__ == "__main__":
    main()
