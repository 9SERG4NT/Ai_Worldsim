"""
WORLDSIM: India Ecosystem — Firestore Helper Utilities
CRUD operations for simulation state, regions, trade hub, and climate events.
"""

from datetime import datetime, timezone
from firebase_config import get_db


# ═══════════════════════════════════════════════════════════════════════════════
# SIMULATION STATE
# ═══════════════════════════════════════════════════════════════════════════════


def get_simulation_state():
    """Fetch the current global simulation state."""
    db = get_db()
    doc = db.collection("simulation_state").document("current").get()
    if doc.exists:
        return doc.to_dict()
    return None


def advance_tick():
    """Increment the simulation tick counter and update timestamp."""
    db = get_db()
    from google.cloud.firestore_v1 import Increment
    
    ref = db.collection("simulation_state").document("current")
    ref.update({
        "current_tick": Increment(1),
        "last_updated": datetime.now(timezone.utc),
    })
    return ref.get().to_dict()


def update_simulation_state(updates: dict):
    """Update global simulation state fields."""
    db = get_db()
    updates["last_updated"] = datetime.now(timezone.utc)
    db.collection("simulation_state").document("current").update(updates)


def update_global_gdp():
    """Recalculate and update global GDP from all regions."""
    db = get_db()
    regions = db.collection("regions").stream()
    
    gdp_scores = []
    for region in regions:
        data = region.to_dict()
        gdp_scores.append(data.get("gdp_score", 0))
    
    total_gdp = sum(gdp_scores)
    mean_gdp = total_gdp / len(gdp_scores) if gdp_scores else 0
    
    # Calculate Gini coefficient approximation
    n = len(gdp_scores)
    if n > 0 and total_gdp > 0:
        sorted_gdp = sorted(gdp_scores)
        cumulative = sum((2 * (i + 1) - n - 1) * val for i, val in enumerate(sorted_gdp))
        gini = cumulative / (n * total_gdp)
    else:
        gini = 0.0
    
    update_simulation_state({
        "global_gdp": total_gdp,
        "gini_coefficient": round(gini, 4),
    })
    
    return {"global_gdp": total_gdp, "gini_coefficient": gini}


# ═══════════════════════════════════════════════════════════════════════════════
# REGIONS
# ═══════════════════════════════════════════════════════════════════════════════


def get_region(code: str):
    """Fetch a single region document by state code (e.g., 'MH')."""
    db = get_db()
    doc = db.collection("regions").document(code).get()
    if doc.exists:
        return doc.to_dict()
    return None


def get_all_regions():
    """Fetch all 10 region documents as a dict keyed by state code."""
    db = get_db()
    regions = {}
    for doc in db.collection("regions").stream():
        regions[doc.id] = doc.to_dict()
    return regions


def update_region(code: str, updates: dict):
    """Update specific fields on a region document."""
    db = get_db()
    updates["last_updated"] = datetime.now(timezone.utc)
    db.collection("regions").document(code).update(updates)


def update_region_resources(code: str, resources: dict):
    """Update a region's resource levels (water, energy, food, tech)."""
    db = get_db()
    update_data = {}
    for resource, value in resources.items():
        update_data[f"resources.{resource}"] = value
    update_data["last_updated"] = datetime.now(timezone.utc)
    db.collection("regions").document(code).update(update_data)


def apply_resource_tick(code: str):
    """Apply one tick of resource generation and consumption to a region."""
    region = get_region(code)
    if not region:
        return None
    
    resources = region["resources"]
    gen_rates = region["resource_generation_rates"]
    con_rates = region["resource_consumption_rates"]
    
    new_resources = {}
    for key in resources:
        generated = gen_rates.get(key, 0)
        consumed = con_rates.get(key, 0)
        new_resources[key] = max(0, resources[key] + generated - consumed)
    
    update_region_resources(code, new_resources)
    return new_resources


def get_region_state_vector(code: str):
    """
    Build a normalized state vector for RL from a region's data.
    Returns a list of floats representing the region's current state.
    """
    region = get_region(code)
    if not region:
        return []
    
    # Normalize resources (divide by max expected values)
    max_vals = {"water": 15000, "energy": 15000, "food": 15000, "tech": 12000}
    
    vector = [
        region["resources"]["water"] / max_vals["water"],
        region["resources"]["energy"] / max_vals["energy"],
        region["resources"]["food"] / max_vals["food"],
        region["resources"]["tech"] / max_vals["tech"],
        region["gdp_score"] / 100.0,
        region["welfare_score"] / 100.0,
        region["demographics"]["workforce_efficiency"],
        region["demographics"]["unrest_level"],
        region["demographics"]["migration_pressure"],
        region["trust_score"] / 100.0,
        region["finops_metrics"]["burn_rate"],
        region["finops_metrics"]["budget_surplus"] / 10000.0,
    ]
    
    # Update the stored RL state vector
    update_region(code, {"rl_state_vector": vector})
    
    return vector


# ═══════════════════════════════════════════════════════════════════════════════
# TRADE HUB
# ═══════════════════════════════════════════════════════════════════════════════


def place_trade_order(from_region: str, offering: dict, requesting: dict):
    """
    Place a new trade order on the open market.
    
    Args:
        from_region: State code (e.g., 'RJ')
        offering: Dict of resources being offered (e.g., {'energy': 500})
        requesting: Dict of resources being requested (e.g., {'water': 200})
    
    Returns:
        Order ID string.
    """
    db = get_db()
    from google.cloud.firestore_v1 import Increment
    
    # Increment order counter
    state_ref = db.collection("trade_hub").document("state")
    state_ref.update({"order_counter": Increment(1)})
    state_data = state_ref.get().to_dict()
    order_num = state_data["order_counter"]
    
    order_id = f"order_{order_num:04d}"
    
    order_data = {
        "from": from_region,
        "offering": offering,
        "requesting": requesting,
        "status": "open",
        "timestamp": datetime.now(timezone.utc),
        "tick": get_simulation_state().get("current_tick", 0),
    }
    
    db.collection("trade_hub").document("state") \
        .collection("open_orders").document(order_id).set(order_data)
    
    return order_id


def get_open_orders(resource_type: str = None):
    """
    Get all open trade orders, optionally filtered by a requested resource.
    
    Args:
        resource_type: Optional filter (e.g., 'water' to find orders requesting water)
    """
    db = get_db()
    orders_ref = db.collection("trade_hub").document("state") \
        .collection("open_orders")
    
    query = orders_ref.where("status", "==", "open")
    orders = {}
    
    for doc in query.stream():
        order = doc.to_dict()
        if resource_type is None or resource_type in order.get("requesting", {}):
            orders[doc.id] = order
    
    return orders


def execute_trade(order_id: str, accepting_region: str):
    """
    Execute a trade by matching an accepting region to an open order.
    Transfers resources between both regions and logs the trade.
    
    Args:
        order_id: The order document ID to execute
        accepting_region: State code of the region accepting the trade
    
    Returns:
        Trade result dict or None if order not found/invalid.
    """
    db = get_db()
    
    order_ref = db.collection("trade_hub").document("state") \
        .collection("open_orders").document(order_id)
    order_doc = order_ref.get()
    
    if not order_doc.exists:
        return None
    
    order = order_doc.to_dict()
    if order["status"] != "open":
        return None
    
    offering_region = order["from"]
    
    # Transfer offered resources: from offering_region → accepting_region
    offering_state = get_region(offering_region)
    accepting_state = get_region(accepting_region)
    
    if not offering_state or not accepting_state:
        return None
    
    # Deduct from offerer, add to accepter
    for resource, amount in order["offering"].items():
        new_offerer_val = max(0, offering_state["resources"][resource] - amount)
        new_accepter_val = accepting_state["resources"][resource] + amount
        update_region_resources(offering_region, {resource: new_offerer_val})
        update_region_resources(accepting_region, {resource: new_accepter_val})
    
    # Transfer requested resources: from accepting_region → offering_region
    accepting_state = get_region(accepting_region)  # Refresh
    offering_state = get_region(offering_region)
    
    for resource, amount in order["requesting"].items():
        new_accepter_val = max(0, accepting_state["resources"][resource] - amount)
        new_offerer_val = offering_state["resources"][resource] + amount
        update_region_resources(accepting_region, {resource: new_accepter_val})
        update_region_resources(offering_region, {resource: new_offerer_val})
    
    # Mark order as executed
    order_ref.update({"status": "executed"})
    
    # Log the executed trade
    trade_log = {
        "from": offering_region,
        "to": accepting_region,
        "offered": order["offering"],
        "received": order["requesting"],
        "tick": get_simulation_state().get("current_tick", 0),
        "timestamp": datetime.now(timezone.utc),
    }
    
    db.collection("trade_hub").document("state") \
        .collection("executed_trades").add(trade_log)
    
    # Update trade hub stats
    from google.cloud.firestore_v1 import Increment
    total_volume = sum(order["offering"].values()) + sum(order["requesting"].values())
    db.collection("trade_hub").document("state").update({
        "total_trades_executed": Increment(1),
        "total_volume_traded": Increment(total_volume),
        "last_updated": datetime.now(timezone.utc),
    })
    
    return trade_log


# ═══════════════════════════════════════════════════════════════════════════════
# CLIMATE EVENTS
# ═══════════════════════════════════════════════════════════════════════════════


def trigger_climate_event(event_id: str):
    """
    Trigger a climate event — applies resource impact to the target region.
    
    Args:
        event_id: The climate event document ID (e.g., 'Drought_RJ')
    
    Returns:
        Dict with impact details or None if event not found.
    """
    db = get_db()
    event_doc = db.collection("climate_events").document(event_id).get()
    
    if not event_doc.exists:
        return None
    
    event = event_doc.to_dict()
    target = event["target_region"]
    region = get_region(target)
    
    if not region:
        return None
    
    impact_report = {"event": event["name"], "target": target, "impacts": {}}
    
    # Apply resource impacts (percentage-based)
    for resource, factor in event.get("resource_impact", {}).items():
        current = region["resources"].get(resource, 0)
        loss = int(abs(current * factor))
        new_val = max(0, current - loss)
        update_region_resources(target, {resource: new_val})
        impact_report["impacts"][resource] = {
            "before": current, "lost": loss, "after": new_val
        }
    
    # Apply infrastructure impacts (absolute reduction)
    for infra, reduction in event.get("infrastructure_impact", {}).items():
        current = region["infrastructure"].get(infra, 0)
        new_val = max(0, current + reduction)  # reduction is negative
        update_region(target, {f"infrastructure.{infra}": new_val})
    
    # Mark event as active
    from google.cloud.firestore_v1 import Increment
    db.collection("climate_events").document(event_id).update({
        "is_active": True,
        "times_triggered": Increment(1),
        "last_triggered_at": datetime.now(timezone.utc),
    })
    
    # Add to active climatic events in simulation state
    sim_state = get_simulation_state()
    active_events = sim_state.get("active_climatic_events", [])
    if event_id not in active_events:
        active_events.append(event_id)
        update_simulation_state({"active_climatic_events": active_events})
    
    return impact_report


def deactivate_climate_event(event_id: str):
    """Deactivate a climate event and remove from active list."""
    db = get_db()
    db.collection("climate_events").document(event_id).update({
        "is_active": False,
    })
    
    sim_state = get_simulation_state()
    active_events = sim_state.get("active_climatic_events", [])
    if event_id in active_events:
        active_events.remove(event_id)
        update_simulation_state({"active_climatic_events": active_events})


# ═══════════════════════════════════════════════════════════════════════════════
# FEDERAL ASSEMBLY
# ═══════════════════════════════════════════════════════════════════════════════


def log_assembly_meeting(transcript: list, resolutions_passed: list):
    """
    Log a Federal Assembly meeting.
    
    Args:
        transcript: List of dicts with 'speaker' and 'text' keys
        resolutions_passed: List of resolution name strings
    
    Returns:
        Meeting document ID.
    """
    db = get_db()
    from google.cloud.firestore_v1 import Increment
    
    # Update metadata counter
    meta_ref = db.collection("federal_assembly_logs").document("metadata")
    meta_ref.update({
        "total_meetings": Increment(1),
        "total_resolutions_passed": Increment(len(resolutions_passed)),
    })
    
    meta_data = meta_ref.get().to_dict()
    meeting_num = meta_data["total_meetings"]
    meeting_id = f"meeting_{meeting_num:03d}"
    
    sim_state = get_simulation_state()
    
    meeting_data = {
        "meeting_id": meeting_id,
        "tick": sim_state.get("current_tick", 0),
        "transcript": transcript,
        "resolutions_passed": resolutions_passed,
        "participants": list(get_all_regions().keys()),
        "timestamp": datetime.now(timezone.utc),
    }
    
    db.collection("federal_assembly_logs").document(meeting_id).set(meeting_data)
    
    # Apply passed resolutions to federal policies
    if resolutions_passed:
        federal_policies = sim_state.get("federal_policies", [])
        federal_policies.extend(resolutions_passed)
        update_simulation_state({"federal_policies": federal_policies})
    
    return meeting_id


# ═══════════════════════════════════════════════════════════════════════════════
# MIGRATION
# ═══════════════════════════════════════════════════════════════════════════════


def check_and_apply_migration(welfare_threshold: float = 35.0, migration_rate: float = 0.02):
    """
    Check for regions below the welfare threshold and migrate population
    to the neighboring region with the highest welfare score.
    
    Args:
        welfare_threshold: Welfare score below which migration triggers
        migration_rate: Fraction of population that migrates per tick
    
    Returns:
        List of migration events that occurred.
    """
    regions = get_all_regions()
    migrations = []
    
    for code, data in regions.items():
        if data["welfare_score"] < welfare_threshold:
            # Find the best destination (highest welfare)
            best_dest = None
            best_welfare = 0
            
            for dest_code, dest_data in regions.items():
                if dest_code != code and dest_data["welfare_score"] > best_welfare:
                    best_welfare = dest_data["welfare_score"]
                    best_dest = dest_code
            
            if best_dest:
                migrants = int(data["population"] * migration_rate)
                
                # Update populations
                update_region(code, {
                    "population": data["population"] - migrants,
                    "demographics.migration_pressure": min(1.0, data["demographics"]["migration_pressure"] + 0.05),
                })
                
                dest_data = regions[best_dest]
                update_region(best_dest, {
                    "population": dest_data["population"] + migrants,
                    "demographics.migration_pressure": max(-1.0, dest_data["demographics"]["migration_pressure"] - 0.03),
                })
                
                migrations.append({
                    "from": code,
                    "to": best_dest,
                    "migrants": migrants,
                    "reason": f"Welfare score {data['welfare_score']:.1f} below threshold {welfare_threshold}",
                })
    
    return migrations


# ═══════════════════════════════════════════════════════════════════════════════
# COOPERATIVE REWARD CALCULATION
# ═══════════════════════════════════════════════════════════════════════════════


def calculate_cooperative_reward(region_code: str, lambda_penalty: float = 0.5):
    """
    Calculate the cooperative reward for a region using the Gini-penalty formula:
    R_global = (Sum GDP_i) - λ * Sum |GDP_i - μ_GDP|
    
    Individual region reward includes both its contribution to GDP growth and
    the penalty for creating inequality.
    
    Args:
        region_code: State code to calculate reward for  
        lambda_penalty: Weight for inequality penalty (higher = more cooperative)
    
    Returns:
        Dict with reward breakdown.
    """
    regions = get_all_regions()
    gdp_scores = [r["gdp_score"] for r in regions.values()]
    
    total_gdp = sum(gdp_scores)
    mean_gdp = total_gdp / len(gdp_scores)
    
    # Deviation penalty
    deviation_penalty = sum(abs(g - mean_gdp) for g in gdp_scores)
    
    # Global reward
    global_reward = total_gdp - lambda_penalty * deviation_penalty
    
    # Individual region's GDP contribution
    region_gdp = regions[region_code]["gdp_score"]
    individual_deviation = abs(region_gdp - mean_gdp)
    
    return {
        "region": region_code,
        "region_gdp": region_gdp,
        "global_reward": round(global_reward, 2),
        "mean_gdp": round(mean_gdp, 2),
        "individual_deviation": round(individual_deviation, 2),
        "deviation_penalty": round(lambda_penalty * individual_deviation, 2),
        "effective_reward": round(region_gdp - lambda_penalty * individual_deviation, 2),
    }
