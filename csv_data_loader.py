"""
CSV Data Loader for WORLDSIM
Parses worldsim_synthetic_dataset_10000_rows.csv and provides
aggregated data for the dashboard API endpoints.
"""
import csv
import os
from collections import defaultdict

CSV_PATH = os.path.join(os.path.dirname(__file__), "worldsim_synthetic_dataset_10000_rows.csv")

STATE_CODES = {
    "Punjab": "PB", "Maharashtra": "MH", "Tamil Nadu": "TN",
    "Karnataka": "KA", "Gujarat": "GJ", "Uttar Pradesh": "UP",
    "Bihar": "BR", "West Bengal": "WB", "Rajasthan": "RJ",
    "Madhya Pradesh": "MP",
}


class CSVDataStore:
    """Loads and indexes the CSV dataset for fast queries."""

    def __init__(self, csv_path=CSV_PATH):
        self.rows = []
        self.gdp_by_tick = defaultdict(dict)       # tick -> {state_code: gdp}
        self.welfare_by_tick = defaultdict(dict)    # tick -> {state_code: welfare}
        self.trades = []                            # executed trades list
        self.all_trades = []                        # all trade rows (BID + ASK)
        self.climate_events = []
        self.state_latest = {}                      # state_code -> latest row snapshot
        self.ticks = set()
        self._load(csv_path)

    def _load(self, path):
        if not os.path.exists(path):
            print(f"[CSV] WARNING: File not found: {path}")
            return

        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    tick = int(row["tick"])
                    state_name = row["state"].strip()
                    state_code = STATE_CODES.get(state_name, state_name[:2].upper())

                    parsed = {
                        "tick": tick,
                        "state": state_code,
                        "state_name": state_name,
                        "population": int(float(row["population"])),
                        "water_supply": round(float(row["water_supply"]), 1),
                        "food_supply": round(float(row["food_supply"]), 1),
                        "energy_supply": round(float(row["energy_supply"]), 1),
                        "water_generated": round(float(row["water_generated"]), 1),
                        "food_generated": round(float(row["food_generated"]), 1),
                        "energy_generated": round(float(row["energy_generated"]), 1),
                        "water_consumed": round(float(row["water_consumed"]), 1),
                        "food_consumed": round(float(row["food_consumed"]), 1),
                        "energy_consumed": round(float(row["energy_consumed"]), 1),
                        "gdp": round(float(row["state_gdp"]), 2),
                        "gdp_growth": round(float(row["gdp_growth_rate"]), 2),
                        "welfare": round(float(row["welfare_index"]), 4),
                        "inequality": round(float(row["inequality_index"]), 4),
                        "migration_in": int(float(row["migration_in"])),
                        "migration_out": int(float(row["migration_out"])),
                        "order_type": row["order_type"].strip(),
                        "resource_type": row["resource_type"].strip(),
                        "trade_quantity": round(float(row["trade_quantity"]), 2),
                        "trade_price": round(float(row["trade_price"]), 2),
                        "trade_executed": int(float(row["trade_executed"])),
                        "climate_event": row["climate_event"].strip(),
                        "shock_intensity": round(float(row["shock_intensity"]), 4),
                    }
                    self.rows.append(parsed)
                    self.ticks.add(tick)

                    # GDP / welfare by tick
                    self.gdp_by_tick[tick][state_code] = parsed["gdp"]
                    self.welfare_by_tick[tick][state_code] = parsed["welfare"]

                    # Track latest data per state
                    if state_code not in self.state_latest or tick > self.state_latest[state_code]["tick"]:
                        self.state_latest[state_code] = parsed

                    # Trade records
                    trade_rec = {
                        "tick": tick,
                        "state": state_code,
                        "order_type": parsed["order_type"],
                        "resource": parsed["resource_type"],
                        "quantity": parsed["trade_quantity"],
                        "price": parsed["trade_price"],
                        "executed": parsed["trade_executed"] == 1,
                    }
                    self.all_trades.append(trade_rec)
                    if parsed["trade_executed"] == 1:
                        self.trades.append(trade_rec)

                    # Climate events
                    if parsed["climate_event"] not in ("None", "none", ""):
                        self.climate_events.append({
                            "tick": tick,
                            "state": state_code,
                            "event": parsed["climate_event"],
                            "intensity": parsed["shock_intensity"],
                        })

                except (ValueError, KeyError) as e:
                    continue  # skip malformed rows

        print(f"[CSV] Loaded {len(self.rows)} rows, {len(self.ticks)} unique ticks, "
              f"{len(self.trades)} executed trades, {len(self.climate_events)} climate events")

    # ── Query methods ────────────────────────────────────────────

    def get_gdp_history(self, limit=50):
        """GDP per state at sampled ticks (for line chart)."""
        sorted_ticks = sorted(self.ticks)
        # Sample evenly if too many ticks
        if len(sorted_ticks) > limit:
            step = len(sorted_ticks) // limit
            sorted_ticks = sorted_ticks[::step][:limit]

        states = sorted(STATE_CODES.values())
        result = []
        for t in sorted_ticks:
            entry = {"tick": t}
            for s in states:
                entry[s] = self.gdp_by_tick.get(t, {}).get(s, 0)
            result.append(entry)
        return result

    def get_welfare_history(self, limit=50):
        """Welfare per state at sampled ticks (for line chart)."""
        sorted_ticks = sorted(self.ticks)
        if len(sorted_ticks) > limit:
            step = len(sorted_ticks) // limit
            sorted_ticks = sorted_ticks[::step][:limit]

        states = sorted(STATE_CODES.values())
        result = []
        for t in sorted_ticks:
            entry = {"tick": t}
            for s in states:
                entry[s] = round(self.welfare_by_tick.get(t, {}).get(s, 0) * 100, 1)
            result.append(entry)
        return result

    def get_trade_history(self, limit=200):
        """Recent executed trades for the trade log."""
        return self.trades[-limit:]

    def get_all_trades(self, limit=200):
        """All recent trade orders (BID + ASK)."""
        return self.all_trades[-limit:]

    def get_resource_overview(self):
        """Latest resource snapshot per state (for bar chart)."""
        states = sorted(STATE_CODES.values())
        result = []
        for s in states:
            data = self.state_latest.get(s, {})
            result.append({
                "state": s,
                "water": data.get("water_supply", 0),
                "food": data.get("food_supply", 0),
                "energy": data.get("energy_supply", 0),
                "gdp": data.get("gdp", 0),
                "welfare": round(data.get("welfare", 0) * 100, 1),
                "inequality": round(data.get("inequality", 0) * 100, 1),
                "population": data.get("population", 0),
            })
        return result

    def get_trade_volume_by_resource(self):
        """Aggregate trade volume by resource type (for pie/bar chart)."""
        volumes = defaultdict(float)
        counts = defaultdict(int)
        for t in self.trades:
            volumes[t["resource"]] += t["quantity"]
            counts[t["resource"]] += 1
        return [
            {"resource": r, "volume": round(volumes[r], 1), "count": counts[r]}
            for r in sorted(volumes.keys())
        ]

    def get_climate_summary(self):
        """Climate event counts by type (for dashboard)."""
        counts = defaultdict(int)
        for e in self.climate_events:
            counts[e["event"]] += 1
        return [{"event": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])]

    def get_state_trade_activity(self):
        """Trade count per state (for bar chart)."""
        buys = defaultdict(int)
        sells = defaultdict(int)
        for t in self.trades:
            if t["order_type"] == "BID":
                buys[t["state"]] += 1
            else:
                sells[t["state"]] += 1
        states = sorted(STATE_CODES.values())
        return [
            {"state": s, "bids": buys.get(s, 0), "asks": sells.get(s, 0)}
            for s in states
        ]


# Singleton instance
_store = None

def get_store():
    global _store
    if _store is None:
        _store = CSVDataStore()
    return _store
