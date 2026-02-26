"""
WORLDSIM: India Ecosystem — World Environment
Core simulation engine that orchestrates the tick loop, integrating
FinOps agents, Governor LLMs, climate engine, treaties, and Firebase sync.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
from config import (
    STATE_CODES, STATE_NAMES, RESOURCE_MAX,
    LLM_DEFICIT_THRESHOLD, LLM_PERIODIC_INTERVAL,
    FEDERAL_ASSEMBLY_INTERVAL, REWARD_LAMBDA,
    WELFARE_MIGRATION_THRESHOLD, MIGRATION_RATE,
    KARMA_RELIEF_BONUS, TARIFF_PER_DISTRUST,
)
from agents.finops_agent import FinOpsAgent
from agents.governor_agent import GovernorAgent
from engine.climate_engine import ClimateEngine
from engine.treaty_manager import TreatyManager
from engine.parliament import Parliament


class WorldEnvironment:
    """
    The core WORLDSIM simulation engine.
    Orchestrates all 10 Indian states through the Dual-Brain architecture.
    """

    def __init__(self, use_llm=True, firebase_sync=True):
        """
        Args:
            use_llm: Whether to invoke Ollama LLM for Governor decisions.
            firebase_sync: Whether to sync state to Firestore each tick.
        """
        self.use_llm = use_llm
        self.firebase_sync = firebase_sync
        self.current_tick = 0

        # ─── Initialize Sub-Systems ──────────────────────────────────
        self.climate_engine = ClimateEngine()
        self.treaty_manager = TreatyManager()
        self.parliament = Parliament()

        # ─── Initialize Agents ───────────────────────────────────────
        self.finops_agents = {code: FinOpsAgent(code) for code in STATE_CODES}
        self.governors = {code: GovernorAgent(code) for code in STATE_CODES}

        # ─── State Cache ─────────────────────────────────────────────
        self.regions_data = {}      # Cached region data from Firestore
        self.state_reports = {}     # Latest FinOps reports per region
        self.tick_log = []          # Log of events per tick

        # ─── Firestore helpers (lazy import) ─────────────────────────
        self._firestore = None

    @property
    def firestore(self):
        """Lazy-load Firestore helpers."""
        if self._firestore is None:
            from utils import firestore_helpers
            self._firestore = firestore_helpers
        return self._firestore

    # ═══════════════════════════════════════════════════════════════════════
    # INITIALIZATION
    # ═══════════════════════════════════════════════════════════════════════

    def initialize(self):
        """Load initial state from Firestore."""
        print("[INIT] Loading state from Firestore...")
        self.regions_data = self.firestore.get_all_regions()

        sim_state = self.firestore.get_simulation_state()
        if sim_state:
            self.current_tick = sim_state.get("current_tick", 0)

        print(f"[INIT] Loaded {len(self.regions_data)} regions at tick {self.current_tick}")
        return self

    # ═══════════════════════════════════════════════════════════════════════
    # MAIN TICK LOOP
    # ═══════════════════════════════════════════════════════════════════════

    def tick(self) -> dict:
        """
        Execute one full simulation tick (1 month).

        Returns:
            Dict summarizing everything that happened this tick.
        """
        self.current_tick += 1
        tick_events = {
            "tick": self.current_tick,
            "resource_updates": {},
            "trades_executed": [],
            "treaties_enforced": [],
            "climate_events": [],
            "migrations": [],
            "llm_actions": [],
            "assembly": None,
            "rewards": {},
        }

        print(f"\n{'─'*60}")
        print(f"  TICK {self.current_tick}")
        print(f"{'─'*60}")

        # ─── Step 1: Produce & Consume Resources ────────────────────
        self._step_produce_consume(tick_events)

        # ─── Step 2: Apply Internal Policies ────────────────────────
        self._step_apply_policies(tick_events)

        # ─── Step 3: Enforce Active Treaties ────────────────────────
        self._step_enforce_treaties(tick_events)

        # ─── Step 4: FinOps Analysis (Quant Brain) ──────────────────
        self._step_finops_analysis(tick_events)

        # ─── Step 5: Climate Engine ─────────────────────────────────
        self._step_climate(tick_events)

        # ─── Step 6: Governor LLM Decisions (Diplomat Brain) ────────
        if self.use_llm:
            self._step_governor_decisions(tick_events)

        # ─── Step 7: Trade Matching ─────────────────────────────────
        self._step_trade_matching(tick_events)

        # ─── Step 8: Migration Check ────────────────────────────────
        self._step_migration(tick_events)

        # ─── Step 9: Federal Assembly (every N ticks) ───────────────
        if self.current_tick % FEDERAL_ASSEMBLY_INTERVAL == 0 and self.use_llm:
            self._step_assembly(tick_events)

        # ─── Step 10: Calculate Rewards & Update GDP ────────────────
        self._step_rewards(tick_events)

        # ─── Step 11: Firebase Sync ─────────────────────────────────
        if self.firebase_sync:
            self._step_firebase_sync(tick_events)

        # ─── Print Tick Summary ─────────────────────────────────────
        self._print_tick_summary(tick_events)

        self.tick_log.append(tick_events)
        return tick_events

    # ═══════════════════════════════════════════════════════════════════════
    # TICK STEPS
    # ═══════════════════════════════════════════════════════════════════════

    def _step_produce_consume(self, tick_events: dict):
        """Step 1: Apply resource generation and consumption rates."""
        for code in STATE_CODES:
            region = self.regions_data.get(code, {})
            resources = region.get("resources", {})
            gen_rates = region.get("resource_generation_rates", {})
            con_rates = region.get("resource_consumption_rates", {})

            new_resources = {}
            for res in ["water", "energy", "food", "tech"]:
                current = resources.get(res, 0)
                gen = gen_rates.get(res, 0)
                con = con_rates.get(res, 0)
                new_resources[res] = max(0, current + gen - con)

            # Update local cache
            self.regions_data[code]["resources"] = new_resources
            tick_events["resource_updates"][code] = new_resources

    def _step_apply_policies(self, tick_events: dict):
        """Step 2: Apply internal policy effects on resource rates."""
        for code in STATE_CODES:
            region = self.regions_data.get(code, {})
            policies = region.get("internal_policies", {})
            resources = region.get("resources", {})

            # Food subsidy: boosts food but costs energy
            food_sub = policies.get("food_subsidy", 0)
            if food_sub > 0:
                food_bonus = int(resources.get("food", 0) * food_sub * 0.1)
                energy_cost = int(food_bonus * 0.5)
                resources["food"] = resources.get("food", 0) + food_bonus
                resources["energy"] = max(0, resources.get("energy", 0) - energy_cost)

            # Water tax: reduces water consumption (preserves water)
            water_tax = policies.get("water_tax", 0)
            if water_tax > 0:
                water_saved = int(resources.get("water", 0) * water_tax * 0.05)
                resources["water"] = resources.get("water", 0) + water_saved

            self.regions_data[code]["resources"] = resources

    def _step_enforce_treaties(self, tick_events: dict):
        """Step 3: Enforce all active treaties."""
        if not self.treaty_manager.active_treaties:
            return

        results = self.treaty_manager.enforce_treaties(
            self.current_tick,
            self.regions_data,
            update_func=self._update_region_resources_local,
        )
        tick_events["treaties_enforced"] = results

        # Apply trust adjustments
        trust_adjustments = self.treaty_manager.calculate_trust_adjustments(results)
        for code, adj in trust_adjustments.items():
            if code in self.regions_data:
                current_trust = self.regions_data[code].get("trust_score", 100)
                self.regions_data[code]["trust_score"] = max(0, min(100, current_trust + adj))

        if results:
            breaches = sum(len(r.get("breaches", [])) for r in results)
            transfers = sum(len(r.get("transfers", [])) for r in results)
            print(f"  [TREATY] {transfers} transfers, {breaches} breaches")

    def _step_finops_analysis(self, tick_events: dict):
        """Step 4: Run FinOps analysis on all regions."""
        self.state_reports = {}
        for code in STATE_CODES:
            region = self.regions_data.get(code, {})
            report = self.finops_agents[code].analyze(region)
            self.state_reports[code] = report

    def _step_climate(self, tick_events: dict):
        """Step 5: Process climate engine."""
        events = self.climate_engine.tick(self.current_tick, self.firestore if self.firebase_sync else None)
        tick_events["climate_events"] = events

        for event in events:
            if event["type"] == "TRIGGERED":
                target = event.get("target_region", "??")
                print(f"  [CLIMATE] {event['event_id']} hit {target}!")

                # Refresh affected region's data from local state
                if target in self.regions_data and event.get("impact"):
                    impact = event["impact"]
                    if isinstance(impact, dict) and "impacts" in impact:
                        for resource, details in impact["impacts"].items():
                            if isinstance(details, dict) and "after" in details:
                                self.regions_data[target]["resources"][resource] = details["after"]

            elif event["type"] == "EXPIRED":
                print(f"  [CLIMATE] {event['event_id']} has ended.")

    def _step_governor_decisions(self, tick_events: dict):
        """Step 6: Invoke Governor LLMs for states needing diplomatic action."""
        # Determine which governors to invoke
        invoke_all = (self.current_tick % LLM_PERIODIC_INTERVAL == 0)
        affected_by_climate = self.climate_engine.get_affected_regions()

        for code in STATE_CODES:
            report = self.state_reports.get(code, {})
            needs_action = (
                invoke_all or
                report.get("needs_governor", False) or
                code in affected_by_climate
            )

            if not needs_action:
                continue

            # Find best trade partner (state with complementary surpluses)
            trade_action = self._governor_negotiate(code, report, tick_events)
            if trade_action:
                tick_events["llm_actions"].append(trade_action)

    def _governor_negotiate(self, code: str, report: dict, tick_events: dict) -> dict | None:
        """Have a governor negotiate with the best available partner."""
        deficits = report.get("deficits", {})
        if not deficits:
            return None

        # Find which resource we need most
        top_deficit = max(deficits.items(), key=lambda x: x[1].get("priority_score", 0))
        needed_resource = top_deficit[0]

        # Find a state that has surplus of that resource
        best_partner = None
        best_surplus = 0

        for other_code in STATE_CODES:
            if other_code == code:
                continue
            other_report = self.state_reports.get(other_code, {})
            other_surpluses = other_report.get("surpluses", {})
            if needed_resource in other_surpluses:
                available = other_surpluses[needed_resource].get("amount_available", 0)
                if available > best_surplus:
                    best_surplus = available
                    best_partner = other_code

        if not best_partner:
            return None

        partner_surpluses = self.state_reports.get(best_partner, {}).get("surpluses", {})

        try:
            proposal = self.governors[code].negotiate_trade(
                report, best_partner, partner_surpluses
            )

            # Auto-accept valid proposals and place as trade orders
            offering = proposal.get("offering", {})
            requesting = proposal.get("requesting", {})

            if offering and requesting:
                self._execute_direct_trade(code, best_partner, offering, requesting)
                print(f"  [LLM] {code} <-> {best_partner}: "
                      f"Trade {offering} for {requesting}")
                return {
                    "type": "TRADE",
                    "from": code,
                    "to": best_partner,
                    "proposal": proposal,
                }
        except Exception as e:
            print(f"  [LLM] {code} negotiation error: {e}")

        return None

    def _step_trade_matching(self, tick_events: dict):
        """Step 7: Match any remaining open orders via FinOps heuristics."""
        # For states with deficits that weren't addressed by LLM,
        # auto-generate simple trades
        for code in STATE_CODES:
            report = self.state_reports.get(code, {})
            recs = report.get("trade_recommendations", [])

            for rec in recs:
                if rec.get("action") != "TRADE":
                    continue

                offer_res = rec.get("offer_resource", "")
                request_res = rec.get("request_resource", "")
                offer_amt = rec.get("offer_amount", 0)
                request_amt = rec.get("request_amount", 0)

                if not offer_res or not request_res or offer_amt <= 0:
                    continue

                # Find a matching partner
                for other_code in STATE_CODES:
                    if other_code == code:
                        continue
                    other_report = self.state_reports.get(other_code, {})
                    other_surpluses = other_report.get("surpluses", {})
                    if request_res in other_surpluses:
                        available = other_surpluses[request_res].get("amount_available", 0)
                        if available >= request_amt:
                            actual_request = min(request_amt, available)
                            self._execute_direct_trade(
                                code, other_code,
                                {offer_res: offer_amt},
                                {request_res: actual_request},
                            )
                            tick_events["trades_executed"].append({
                                "from": code, "to": other_code,
                                "offered": {offer_res: offer_amt},
                                "received": {request_res: actual_request},
                                "type": "AUTO",
                            })
                            break  # One trade per deficit

    def _step_migration(self, tick_events: dict):
        """Step 8: Check for population migration due to low welfare."""
        migrations = []
        for code in STATE_CODES:
            region = self.regions_data.get(code, {})
            welfare = region.get("welfare_score", 50)

            if welfare < WELFARE_MIGRATION_THRESHOLD:
                # Find best destination
                best_dest = None
                best_welfare = 0

                for dest_code in STATE_CODES:
                    if dest_code == code:
                        continue
                    dest_welfare = self.regions_data.get(dest_code, {}).get("welfare_score", 0)
                    if dest_welfare > best_welfare:
                        best_welfare = dest_welfare
                        best_dest = dest_code

                if best_dest and best_welfare > welfare:
                    pop = region.get("population", 0)
                    migrants = int(pop * MIGRATION_RATE)
                    if migrants > 0:
                        self.regions_data[code]["population"] = pop - migrants
                        dest_pop = self.regions_data[best_dest].get("population", 0)
                        self.regions_data[best_dest]["population"] = dest_pop + migrants

                        migrations.append({
                            "from": code, "to": best_dest,
                            "migrants": migrants,
                        })
                        print(f"  [MIGRATION] {migrants:,} people: {code} -> {best_dest}")

        tick_events["migrations"] = migrations

    def _step_assembly(self, tick_events: dict):
        """Step 9: Convene Federal Assembly."""
        result = self.parliament.convene_assembly(
            self.governors,
            self.state_reports,
            self.current_tick,
            self.firestore if self.firebase_sync else None,
        )
        tick_events["assembly"] = result

    def _step_rewards(self, tick_events: dict):
        """Step 10: Calculate cooperative rewards and update GDP/welfare."""
        gdp_scores = []

        for code in STATE_CODES:
            region = self.regions_data.get(code, {})
            resources = region.get("resources", {})

            # GDP is a function of resources, population, and workforce
            pop = region.get("population", 1)
            workforce = region.get("demographics", {}).get("workforce_efficiency", 0.5)
            tech = resources.get("tech", 0)
            energy = resources.get("energy", 0)

            # GDP formula: weighted resources per capita, scaled by workforce
            pop_millions = max(1, pop / 1_000_000)
            resource_index = (
                tech * 0.004 +
                energy * 0.002 +
                resources.get("food", 0) * 0.001 +
                resources.get("water", 0) * 0.001
            )
            gdp = (resource_index / pop_millions * 10) * workforce
            gdp = round(min(100, max(0, gdp)), 1)
            self.regions_data[code]["gdp_score"] = gdp
            gdp_scores.append(gdp)

            # Welfare score based on food + water adequacy
            food = resources.get("food", 0)
            water = resources.get("water", 0)
            food_ratio = min(1.0, food / max(1, RESOURCE_MAX["food"] * 0.3))
            water_ratio = min(1.0, water / max(1, RESOURCE_MAX["water"] * 0.2))
            unrest = region.get("demographics", {}).get("unrest_level", 0)

            welfare = (food_ratio * 40 + water_ratio * 40 + (1 - unrest) * 20)
            welfare = round(min(100, max(0, welfare)), 1)
            self.regions_data[code]["welfare_score"] = welfare

            # Update unrest based on welfare
            if welfare < 40:
                new_unrest = min(1.0, unrest + 0.02)
            elif welfare > 70:
                new_unrest = max(0, unrest - 0.01)
            else:
                new_unrest = unrest
            self.regions_data[code].setdefault("demographics", {})["unrest_level"] = new_unrest

        # Cooperative reward (Gini penalty)
        if gdp_scores:
            total_gdp = sum(gdp_scores)
            mean_gdp = total_gdp / len(gdp_scores)
            deviation = sum(abs(g - mean_gdp) for g in gdp_scores)
            global_reward = total_gdp - REWARD_LAMBDA * deviation
            gini = deviation / (total_gdp + 1e-6)

            tick_events["rewards"] = {
                "global_gdp": round(total_gdp, 1),
                "mean_gdp": round(mean_gdp, 1),
                "gini_coefficient": round(gini, 4),
                "global_reward": round(global_reward, 1),
            }

    def _step_firebase_sync(self, tick_events: dict):
        """Step 11: Push state to Firestore."""
        try:
            # Update simulation state
            rewards = tick_events.get("rewards", {})
            self.firestore.update_simulation_state({
                "current_tick": self.current_tick,
                "global_gdp": rewards.get("global_gdp", 0),
                "gini_coefficient": rewards.get("gini_coefficient", 0),
                "simulation_status": "running",
            })

            # Update regions (batch — update key fields only)
            for code in STATE_CODES:
                region = self.regions_data.get(code, {})
                self.firestore.update_region(code, {
                    "resources": region.get("resources", {}),
                    "gdp_score": region.get("gdp_score", 0),
                    "welfare_score": region.get("welfare_score", 0),
                    "population": region.get("population", 0),
                    "trust_score": region.get("trust_score", 100),
                    "demographics": region.get("demographics", {}),
                })
        except Exception as e:
            print(f"  [FIREBASE] Sync error: {e}")

    # ═══════════════════════════════════════════════════════════════════════
    # HELPERS
    # ═══════════════════════════════════════════════════════════════════════

    def _update_region_resources_local(self, code: str, resource_updates: dict):
        """Update region resources in local cache (used by treaty manager)."""
        if code in self.regions_data:
            for res, val in resource_updates.items():
                self.regions_data[code]["resources"][res] = val

    def _execute_direct_trade(self, from_code: str, to_code: str,
                               offering: dict, requesting: dict):
        """Execute a direct resource trade between two regions in local cache."""
        from_res = self.regions_data.get(from_code, {}).get("resources", {})
        to_res = self.regions_data.get(to_code, {}).get("resources", {})

        # Transfer offered resources: from -> to
        for res, amount in offering.items():
            amount = min(amount, from_res.get(res, 0))  # Can't give more than you have
            from_res[res] = max(0, from_res.get(res, 0) - amount)
            to_res[res] = to_res.get(res, 0) + amount

        # Transfer requested resources: to -> from
        for res, amount in requesting.items():
            amount = min(amount, to_res.get(res, 0))
            to_res[res] = max(0, to_res.get(res, 0) - amount)
            from_res[res] = from_res.get(res, 0) + amount

    # ═══════════════════════════════════════════════════════════════════════
    # OUTPUT
    # ═══════════════════════════════════════════════════════════════════════

    def _print_tick_summary(self, tick_events: dict):
        """Print a compact summary of the tick."""
        rewards = tick_events.get("rewards", {})
        trades = len(tick_events.get("trades_executed", []))
        llm_actions = len(tick_events.get("llm_actions", []))
        climate = len(tick_events.get("climate_events", []))
        migrations = len(tick_events.get("migrations", []))

        print(f"  GDP: {rewards.get('global_gdp', 0):.0f} | "
              f"Gini: {rewards.get('gini_coefficient', 0):.3f} | "
              f"Trades: {trades} | LLM: {llm_actions} | "
              f"Climate: {climate} | Migration: {migrations}")

        # Compact resource summary
        for code in STATE_CODES:
            res = self.regions_data.get(code, {}).get("resources", {})
            gdp = self.regions_data.get(code, {}).get("gdp_score", 0)
            welfare = self.regions_data.get(code, {}).get("welfare_score", 0)
            trust = self.regions_data.get(code, {}).get("trust_score", 100)

            # Color-code status
            status = ""
            report = self.state_reports.get(code, {})
            if report.get("health_score", 100) < 40:
                status = " [!CRITICAL]"
            elif report.get("needs_governor", False):
                status = " [DEFICIT]"

            print(f"    {code}: W={res.get('water',0):>5} E={res.get('energy',0):>5} "
                  f"F={res.get('food',0):>5} T={res.get('tech',0):>5} | "
                  f"GDP={gdp:>5.1f} WF={welfare:>5.1f} TR={trust:>3}{status}")

    def get_state_snapshot(self) -> dict:
        """Get a complete snapshot of the current world state."""
        return {
            "tick": self.current_tick,
            "regions": {code: {
                "resources": self.regions_data.get(code, {}).get("resources", {}),
                "gdp_score": self.regions_data.get(code, {}).get("gdp_score", 0),
                "welfare_score": self.regions_data.get(code, {}).get("welfare_score", 0),
                "population": self.regions_data.get(code, {}).get("population", 0),
                "trust_score": self.regions_data.get(code, {}).get("trust_score", 100),
            } for code in STATE_CODES},
            "active_treaties": self.treaty_manager.get_summary(),
            "active_climate": list(self.climate_engine.active_events.keys()),
            "passed_resolutions": [r["name"] for r in self.parliament.passed_resolutions],
        }
