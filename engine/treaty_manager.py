"""
WORLDSIM: India Ecosystem — Treaty Manager
Manages multi-tick treaties with enforcement, breach detection, and trust scoring.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone
from config import (
    MAX_ACTIVE_TREATIES_PER_STATE,
    TREATY_BREACH_TRUST_PENALTY,
    TREATY_HONOR_TRUST_BONUS,
)


class Treaty:
    """Represents a single multi-tick resource exchange agreement."""

    def __init__(self, treaty_id, from_region, to_region, per_tick_offer,
                 per_tick_request, duration_ticks, conditions=""):
        self.treaty_id = treaty_id
        self.from_region = from_region
        self.to_region = to_region
        self.per_tick_offer = per_tick_offer      # {"resource": amount}
        self.per_tick_request = per_tick_request   # {"resource": amount}
        self.duration_ticks = duration_ticks
        self.ticks_remaining = duration_ticks
        self.conditions = conditions
        self.is_active = True
        self.breaches = []       # List of breach records
        self.created_tick = 0

    def to_dict(self) -> dict:
        return {
            "treaty_id": self.treaty_id,
            "from_region": self.from_region,
            "to_region": self.to_region,
            "per_tick_offer": self.per_tick_offer,
            "per_tick_request": self.per_tick_request,
            "duration_ticks": self.duration_ticks,
            "ticks_remaining": self.ticks_remaining,
            "conditions": self.conditions,
            "is_active": self.is_active,
            "breaches": self.breaches,
            "created_tick": self.created_tick,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Treaty":
        t = cls(
            treaty_id=data["treaty_id"],
            from_region=data["from_region"],
            to_region=data["to_region"],
            per_tick_offer=data["per_tick_offer"],
            per_tick_request=data["per_tick_request"],
            duration_ticks=data["duration_ticks"],
            conditions=data.get("conditions", ""),
        )
        t.ticks_remaining = data.get("ticks_remaining", data["duration_ticks"])
        t.is_active = data.get("is_active", True)
        t.breaches = data.get("breaches", [])
        t.created_tick = data.get("created_tick", 0)
        return t


class TreatyManager:
    """
    Manages the full treaty lifecycle: creation, enforcement, breach detection,
    and trust score impact.
    """

    def __init__(self):
        self.active_treaties: list[Treaty] = []
        self.expired_treaties: list[Treaty] = []
        self.treaty_counter = 0

    def create_treaty(self, proposal: dict, current_tick: int) -> Treaty | None:
        """
        Create a treaty from a Governor's proposal.

        Args:
            proposal: Dict with from, to, per_tick_offer, per_tick_request, duration_ticks
            current_tick: Current simulation tick

        Returns:
            Created Treaty or None if limits exceeded.
        """
        from_region = proposal.get("from", "")
        to_region = proposal.get("to", "")

        # Check treaty limits
        from_count = sum(1 for t in self.active_treaties
                         if t.from_region == from_region or t.to_region == from_region)
        to_count = sum(1 for t in self.active_treaties
                       if t.from_region == to_region or t.to_region == to_region)

        if from_count >= MAX_ACTIVE_TREATIES_PER_STATE:
            return None
        if to_count >= MAX_ACTIVE_TREATIES_PER_STATE:
            return None

        self.treaty_counter += 1
        treaty_id = f"Treaty_{self.treaty_counter:03d}_{from_region}_{to_region}"

        treaty = Treaty(
            treaty_id=treaty_id,
            from_region=from_region,
            to_region=to_region,
            per_tick_offer=proposal.get("per_tick_offer", {}),
            per_tick_request=proposal.get("per_tick_request", {}),
            duration_ticks=proposal.get("duration_ticks", 20),
            conditions=proposal.get("conditions", ""),
        )
        treaty.created_tick = current_tick
        self.active_treaties.append(treaty)

        return treaty

    def enforce_treaties(self, current_tick: int, regions_data: dict,
                          update_func=None) -> list:
        """
        Enforce all active treaties for one tick.

        Args:
            current_tick: Current tick
            regions_data: Dict of all regions' current data
            update_func: Function to update region resources (code, {resource: value})

        Returns:
            List of enforcement results (transfers and breaches).
        """
        results = []
        expired = []

        for treaty in self.active_treaties:
            if not treaty.is_active:
                continue

            result = self._enforce_single(treaty, regions_data, update_func, current_tick)
            results.append(result)

            treaty.ticks_remaining -= 1
            if treaty.ticks_remaining <= 0:
                treaty.is_active = False
                expired.append(treaty)

        # Move expired treaties
        for treaty in expired:
            self.active_treaties.remove(treaty)
            self.expired_treaties.append(treaty)

        return results

    def _enforce_single(self, treaty: Treaty, regions_data: dict,
                         update_func, current_tick: int) -> dict:
        """Enforce a single treaty for one tick."""
        result = {
            "treaty_id": treaty.treaty_id,
            "from": treaty.from_region,
            "to": treaty.to_region,
            "transfers": [],
            "breaches": [],
        }

        from_data = regions_data.get(treaty.from_region, {})
        to_data = regions_data.get(treaty.to_region, {})
        from_resources = from_data.get("resources", {})
        to_resources = to_data.get("resources", {})

        # ─── From-region delivers their offer ────────────────────────
        for resource, amount in treaty.per_tick_offer.items():
            available = from_resources.get(resource, 0)
            if available >= amount:
                # Transfer succeeds
                if update_func:
                    update_func(treaty.from_region, {resource: available - amount})
                    to_current = to_resources.get(resource, 0)
                    update_func(treaty.to_region, {resource: to_current + amount})
                result["transfers"].append({
                    "direction": f"{treaty.from_region} -> {treaty.to_region}",
                    "resource": resource,
                    "amount": amount,
                    "status": "DELIVERED",
                })
            else:
                # Breach!
                treaty.breaches.append({
                    "tick": current_tick,
                    "breacher": treaty.from_region,
                    "resource": resource,
                    "promised": amount,
                    "available": available,
                })
                result["breaches"].append({
                    "breacher": treaty.from_region,
                    "resource": resource,
                    "shortfall": amount - available,
                })

        # ─── To-region delivers their counter (the request) ──────────
        # Refresh to_resources after possible updates
        to_data = regions_data.get(treaty.to_region, {})
        to_resources = to_data.get("resources", {})

        for resource, amount in treaty.per_tick_request.items():
            available = to_resources.get(resource, 0)
            if available >= amount:
                if update_func:
                    update_func(treaty.to_region, {resource: available - amount})
                    from_current = from_resources.get(resource, 0)
                    update_func(treaty.from_region, {resource: from_current + amount})
                result["transfers"].append({
                    "direction": f"{treaty.to_region} -> {treaty.from_region}",
                    "resource": resource,
                    "amount": amount,
                    "status": "DELIVERED",
                })
            else:
                treaty.breaches.append({
                    "tick": current_tick,
                    "breacher": treaty.to_region,
                    "resource": resource,
                    "promised": amount,
                    "available": available,
                })
                result["breaches"].append({
                    "breacher": treaty.to_region,
                    "resource": resource,
                    "shortfall": amount - available,
                })

        return result

    def calculate_trust_adjustments(self, enforcement_results: list) -> dict:
        """
        Calculate trust score adjustments based on treaty enforcement.

        Returns:
            Dict of {region_code: trust_adjustment} values.
        """
        adjustments = {}

        for result in enforcement_results:
            from_r = result["from"]
            to_r = result["to"]

            # Initialize
            adjustments.setdefault(from_r, 0)
            adjustments.setdefault(to_r, 0)

            if result["breaches"]:
                for breach in result["breaches"]:
                    breacher = breach["breacher"]
                    adjustments[breacher] -= TREATY_BREACH_TRUST_PENALTY
            else:
                # Both honored — small trust boost
                adjustments[from_r] += TREATY_HONOR_TRUST_BONUS
                adjustments[to_r] += TREATY_HONOR_TRUST_BONUS

        return adjustments

    def get_treaties_for_region(self, region_code: str) -> list:
        """Get all active treaties involving a specific region."""
        return [
            t for t in self.active_treaties
            if t.from_region == region_code or t.to_region == region_code
        ]

    def get_summary(self) -> dict:
        """Get a summary of the treaty system state."""
        return {
            "active_treaties": len(self.active_treaties),
            "expired_treaties": len(self.expired_treaties),
            "total_created": self.treaty_counter,
            "active_list": [t.to_dict() for t in self.active_treaties],
        }
