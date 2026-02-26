"""
WORLDSIM: India Ecosystem — Simulation Runner
Main entry point to run the multi-agent simulation.

Usage:
    python run_simulation.py                   # Run 20 ticks with LLM
    python run_simulation.py --ticks 50        # Run 50 ticks
    python run_simulation.py --no-llm          # Run without LLM (quant only)
    python run_simulation.py --no-firebase     # Run without Firebase sync
    python run_simulation.py --ticks 5 --no-llm --no-firebase  # Quick dry run
"""

import sys
import os
import argparse
import time

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ["PYTHONIOENCODING"] = "utf-8"

from config import DEFAULT_TICKS, TICK_DELAY_SECONDS, OLLAMA_MODEL, OLLAMA_BASE_URL


def print_banner():
    print()
    print("=" * 70)
    print("  WORLDSIM: India Ecosystem")
    print("  Multi-Agent RL & LLM Governance Simulation")
    print("=" * 70)
    print()


def check_ollama(use_llm: bool):
    """Verify Ollama is running and model is available."""
    if not use_llm:
        print("[SETUP] LLM disabled — running in Quant-only mode.")
        return True

    print(f"[SETUP] Checking Ollama at {OLLAMA_BASE_URL}...")
    from agents.ollama_client import get_ollama_client

    client = get_ollama_client()

    if not client.is_healthy():
        print("[ERROR] Ollama is not running!")
        print("  Start Ollama with: ollama serve")
        print("  Falling back to Quant-only mode.\n")
        return False

    models = client.list_models()
    print(f"[SETUP] Available models: {models}")

    if not client.model_available():
        print(f"[WARN] Model '{OLLAMA_MODEL}' not found.")
        print(f"  Pull it with: ollama pull {OLLAMA_MODEL}")
        if models:
            print(f"  Using first available model instead.")
        else:
            print("  No models available — falling back to Quant-only mode.\n")
            return False

    print(f"[SETUP] Using model: {OLLAMA_MODEL}")
    return True


def check_firebase(use_firebase: bool):
    """Verify Firebase connection."""
    if not use_firebase:
        print("[SETUP] Firebase sync disabled — running local only.")
        return True

    print("[SETUP] Connecting to Firebase...")
    try:
        from firebase_config import initialize_firebase
        db = initialize_firebase()
        print("[SETUP] Firebase connected.")
        return True
    except Exception as e:
        print(f"[ERROR] Firebase connection failed: {e}")
        print("  Running without Firebase sync.\n")
        return False


def run_simulation(ticks: int, use_llm: bool, use_firebase: bool, delay: float):
    """Run the main simulation loop."""
    from engine.world_env import WorldEnvironment

    # Initialize
    env = WorldEnvironment(use_llm=use_llm, firebase_sync=use_firebase)

    if use_firebase:
        env.initialize()
    else:
        # Load seed data directly for offline mode
        from seed_firestore import REGIONS_DATA
        env.regions_data = {}
        for code, data in REGIONS_DATA.items():
            env.regions_data[code] = dict(data)
        print(f"[INIT] Loaded {len(env.regions_data)} regions from seed data (offline)")

    print(f"\n[SIM] Starting simulation: {ticks} ticks")
    print(f"[SIM] LLM: {'ON' if use_llm else 'OFF'} | "
          f"Firebase: {'ON' if use_firebase else 'OFF'} | "
          f"Delay: {delay}s")
    print()

    start_time = time.time()

    try:
        for i in range(ticks):
            tick_result = env.tick()

            if delay > 0:
                time.sleep(delay)

    except KeyboardInterrupt:
        print("\n\n[SIM] Interrupted by user. Saving state...")
        if use_firebase:
            try:
                env._step_firebase_sync({"rewards": tick_result.get("rewards", {})})
                print("[SIM] State saved to Firebase.")
            except Exception:
                pass

    elapsed = time.time() - start_time

    # ─── Final Summary ─────────────────────────────────────────────────
    print()
    print("=" * 70)
    print("  SIMULATION COMPLETE")
    print("=" * 70)
    snapshot = env.get_state_snapshot()
    print(f"  Ticks Completed: {snapshot['tick']}")
    print(f"  Elapsed Time:    {elapsed:.1f}s ({elapsed/max(1,snapshot['tick']):.2f}s/tick)")
    print(f"  Active Treaties: {snapshot['active_treaties']['active_treaties']}")
    print(f"  Climate Events:  {len(snapshot['active_climate'])}")
    print(f"  Resolutions:     {len(snapshot['passed_resolutions'])}")
    print()

    # Final state table
    print(f"  {'State':<8} {'Water':>6} {'Energy':>7} {'Food':>6} {'Tech':>6} "
          f"{'GDP':>6} {'Welfare':>8} {'Trust':>6} {'Pop(M)':>8}")
    print(f"  {'─'*67}")

    for code in sorted(snapshot["regions"].keys()):
        r = snapshot["regions"][code]
        res = r.get("resources", {})
        pop_m = r.get("population", 0) / 1_000_000
        print(f"  {code:<8} {res.get('water',0):>6} {res.get('energy',0):>7} "
              f"{res.get('food',0):>6} {res.get('tech',0):>6} "
              f"{r.get('gdp_score',0):>6.1f} {r.get('welfare_score',0):>8.1f} "
              f"{r.get('trust_score',100):>6} {pop_m:>8.1f}")

    print()
    if snapshot["passed_resolutions"]:
        print(f"  Passed Resolutions: {', '.join(snapshot['passed_resolutions'])}")

    if use_firebase:
        print(f"\n  View live data: https://console.firebase.google.com/project/"
              f"amar-swaroop-db/firestore")

    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(
        description="WORLDSIM: India Ecosystem — Multi-Agent Simulation Runner"
    )
    parser.add_argument(
        "--ticks", type=int, default=DEFAULT_TICKS,
        help=f"Number of simulation ticks to run (default: {DEFAULT_TICKS})"
    )
    parser.add_argument(
        "--no-llm", action="store_true",
        help="Disable LLM Governor agents (quant-only mode)"
    )
    parser.add_argument(
        "--no-firebase", action="store_true",
        help="Disable Firebase sync (run entirely local)"
    )
    parser.add_argument(
        "--delay", type=float, default=TICK_DELAY_SECONDS,
        help=f"Delay between ticks in seconds (default: {TICK_DELAY_SECONDS})"
    )
    parser.add_argument(
        "--llm-every-tick", action="store_true",
        help="Invoke LLM governors every tick (slow but thorough)"
    )

    args = parser.parse_args()

    print_banner()

    # Override LLM interval if requested
    if args.llm_every_tick:
        import config
        config.LLM_PERIODIC_INTERVAL = 1

    # Pre-flight checks
    use_llm = not args.no_llm
    use_firebase = not args.no_firebase

    if use_llm:
        llm_ok = check_ollama(True)
        if not llm_ok:
            use_llm = False

    if use_firebase:
        fb_ok = check_firebase(True)
        if not fb_ok:
            use_firebase = False

    print()

    # Run!
    run_simulation(
        ticks=args.ticks,
        use_llm=use_llm,
        use_firebase=use_firebase,
        delay=args.delay,
    )


if __name__ == "__main__":
    main()
