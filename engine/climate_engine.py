"""
WORLDSIM: India Ecosystem — Climate Engine
Drives dynamic climate shocks with geographic/seasonal weighting.
"""

import sys
import os
import random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import CLIMATE_EVENT_PROBABILITY, CLIMATE_MIN_INTERVAL


class ClimateEngine:
    """Manages randomized climate events with geographic weighting."""

    # Event IDs mapped from seeded Firestore data
    ALL_EVENTS = [
        "Drought_RJ",
        "Cyclone_WB",
        "Flood_BR",
        "Heatwave_UP",
        "Monsoon_Failure_TN",
        "Industrial_Accident_GJ",
        "Kaveri_Dispute_KA_TN",
    ]

    # Weighted probabilities per event (sum to ~1.0)
    EVENT_WEIGHTS = {
        "Drought_RJ": 0.20,
        "Cyclone_WB": 0.15,
        "Flood_BR": 0.18,
        "Heatwave_UP": 0.15,
        "Monsoon_Failure_TN": 0.15,
        "Industrial_Accident_GJ": 0.10,
        "Kaveri_Dispute_KA_TN": 0.07,
    }

    def __init__(self):
        self.last_event_tick = -CLIMATE_MIN_INTERVAL  # Allow events from tick 0
        self.active_events = {}  # event_id -> ticks remaining

    def tick(self, current_tick: int, firestore_helpers=None) -> list:
        """
        Process one tick of the climate engine.

        Args:
            current_tick: Current simulation tick.
            firestore_helpers: The firestore_helpers module (for triggering events).

        Returns:
            List of event dicts that were triggered or expired this tick.
        """
        events_this_tick = []

        # ─── Check for new events ────────────────────────────────────
        ticks_since_last = current_tick - self.last_event_tick
        if ticks_since_last >= CLIMATE_MIN_INTERVAL:
            if random.random() < CLIMATE_EVENT_PROBABILITY:
                event = self._select_event()
                if event and event not in self.active_events:
                    impact = self._trigger_event(event, firestore_helpers)
                    if impact:
                        events_this_tick.append({
                            "type": "TRIGGERED",
                            "event_id": event,
                            **impact,
                        })
                        self.last_event_tick = current_tick

        # ─── Tick down active events ─────────────────────────────────
        expired = []
        for event_id, ticks_left in self.active_events.items():
            self.active_events[event_id] = ticks_left - 1
            if self.active_events[event_id] <= 0:
                expired.append(event_id)

        for event_id in expired:
            del self.active_events[event_id]
            if firestore_helpers:
                firestore_helpers.deactivate_climate_event(event_id)
            events_this_tick.append({
                "type": "EXPIRED",
                "event_id": event_id,
            })

        return events_this_tick

    def _select_event(self) -> str | None:
        """Select a random climate event using weighted probabilities."""
        events = list(self.EVENT_WEIGHTS.keys())
        weights = list(self.EVENT_WEIGHTS.values())

        # Don't re-trigger active events
        available = [(e, w) for e, w in zip(events, weights) if e not in self.active_events]
        if not available:
            return None

        av_events, av_weights = zip(*available)
        total = sum(av_weights)
        normalized = [w / total for w in av_weights]

        return random.choices(av_events, weights=normalized, k=1)[0]

    def _trigger_event(self, event_id: str, firestore_helpers=None) -> dict | None:
        """Trigger a specific climate event."""
        # Get event duration from hardcoded data
        durations = {
            "Drought_RJ": 10,
            "Cyclone_WB": 8,
            "Flood_BR": 6,
            "Heatwave_UP": 5,
            "Monsoon_Failure_TN": 12,
            "Industrial_Accident_GJ": 7,
            "Kaveri_Dispute_KA_TN": 15,
        }

        targets = {
            "Drought_RJ": "RJ",
            "Cyclone_WB": "WB",
            "Flood_BR": "BR",
            "Heatwave_UP": "UP",
            "Monsoon_Failure_TN": "TN",
            "Industrial_Accident_GJ": "GJ",
            "Kaveri_Dispute_KA_TN": "KA",
        }

        duration = durations.get(event_id, 5)
        target = targets.get(event_id, "")

        self.active_events[event_id] = duration

        impact_report = None
        if firestore_helpers:
            impact_report = firestore_helpers.trigger_climate_event(event_id)

        return {
            "event_id": event_id,
            "target_region": target,
            "duration": duration,
            "impact": impact_report,
        }

    def get_affected_regions(self) -> set:
        """Get the set of regions currently affected by climate events."""
        targets = {
            "Drought_RJ": "RJ",
            "Cyclone_WB": "WB",
            "Flood_BR": "BR",
            "Heatwave_UP": "UP",
            "Monsoon_Failure_TN": "TN",
            "Industrial_Accident_GJ": "GJ",
            "Kaveri_Dispute_KA_TN": "KA",
        }
        return {targets[e] for e in self.active_events if e in targets}

    def force_trigger(self, event_id: str, firestore_helpers=None) -> dict | None:
        """Force trigger a specific event (for testing or manual injection)."""
        return self._trigger_event(event_id, firestore_helpers)
