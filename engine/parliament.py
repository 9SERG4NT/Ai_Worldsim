"""
WORLDSIM: India Ecosystem — Parliament / Federal Assembly
Multi-turn LLM deliberation where all 10 Governors propose and vote on policies.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import STATE_CODES, STATE_NAMES, FEDERAL_ASSEMBLY_MAJORITY


class Parliament:
    """
    Federal Assembly system where Governor LLMs propose and vote on national policies.
    Triggered every N ticks (configurable).
    """

    def __init__(self):
        self.meeting_count = 0
        self.passed_resolutions = []
        self.meeting_history = []

    def convene_assembly(self, governors: dict, state_reports: dict,
                          current_tick: int, firestore_helpers=None) -> dict:
        """
        Run a full Federal Assembly meeting.

        Args:
            governors: Dict of {region_code: GovernorAgent}
            state_reports: Dict of {region_code: StateReport}
            current_tick: Current simulation tick
            firestore_helpers: Optional module for Firestore logging

        Returns:
            Meeting results dict with proposals, votes, and passed resolutions.
        """
        self.meeting_count += 1
        meeting_id = f"meeting_{self.meeting_count:03d}"

        print(f"\n{'='*70}")
        print(f"  FEDERAL ASSEMBLY — Meeting #{self.meeting_count} (Tick {current_tick})")
        print(f"{'='*70}")

        # ─── Phase 1: Collect proposals from all governors ──────────
        all_states_summary = self._build_national_summary(state_reports)
        proposals = []
        transcript = []

        for code in STATE_CODES:
            if code not in governors or code not in state_reports:
                continue

            governor = governors[code]
            report = state_reports[code]

            proposal = governor.propose_federal_policy(report, all_states_summary)
            proposals.append(proposal)

            speech = proposal.get("speech", "No speech provided.")
            transcript.append({
                "speaker": f"{STATE_NAMES.get(code, code)}_Governor",
                "text": speech,
            })
            print(f"  [{code}] {STATE_NAMES.get(code, code)}: {speech[:80]}...")

        # ─── Phase 2: Select top proposals for voting ───────────────
        # Pick up to 3 proposals with the most impactful effects
        top_proposals = proposals[:3]  # Simple selection for now

        # ─── Phase 3: Vote on each proposal ─────────────────────────
        passed_resolutions = []
        voting_results = []

        for proposal in top_proposals:
            policy_name = proposal.get("policy_name", "Unknown Policy")
            proposer = proposal.get("proposer", "??")

            print(f"\n  VOTE: '{policy_name}' (proposed by {proposer})")

            votes = {"YES": [], "NO": []}

            for code in STATE_CODES:
                if code not in governors or code not in state_reports:
                    continue

                governor = governors[code]
                report = state_reports[code]

                vote_result = governor.vote_on_policy(report, proposal)
                vote = vote_result.get("vote", "YES").upper()

                if vote in ("YES", "NO"):
                    votes[vote].append(code)
                else:
                    votes["YES"].append(code)  # Default to YES on parse error

                transcript.append({
                    "speaker": f"{STATE_NAMES.get(code, code)}_Governor",
                    "text": f"VOTE {vote}: {vote_result.get('reasoning', '')}",
                })

            # ─── Tally ──────────────────────────────────────────
            total_voters = len(votes["YES"]) + len(votes["NO"])
            yes_ratio = len(votes["YES"]) / total_voters if total_voters > 0 else 0
            passed = yes_ratio >= FEDERAL_ASSEMBLY_MAJORITY

            vote_record = {
                "policy_name": policy_name,
                "proposer": proposer,
                "yes_votes": votes["YES"],
                "no_votes": votes["NO"],
                "yes_count": len(votes["YES"]),
                "no_count": len(votes["NO"]),
                "ratio": round(yes_ratio, 2),
                "passed": passed,
                "proposal": proposal,
            }
            voting_results.append(vote_record)

            status = "PASSED" if passed else "REJECTED"
            print(f"  RESULT: {status} ({len(votes['YES'])}/{total_voters}, "
                  f"{yes_ratio:.0%})")

            if passed:
                passed_resolutions.append(policy_name)
                self.passed_resolutions.append({
                    "name": policy_name,
                    "proposal": proposal,
                    "tick_passed": current_tick,
                })

        # ─── Log to Firestore ───────────────────────────────────────
        if firestore_helpers and passed_resolutions:
            try:
                firestore_helpers.log_assembly_meeting(transcript, passed_resolutions)
            except Exception as e:
                print(f"  [!] Failed to log assembly: {e}")

        meeting_result = {
            "meeting_id": meeting_id,
            "tick": current_tick,
            "proposals_count": len(proposals),
            "voting_results": voting_results,
            "passed_resolutions": passed_resolutions,
            "transcript": transcript,
        }

        self.meeting_history.append(meeting_result)

        print(f"\n  Assembly concluded. {len(passed_resolutions)} resolution(s) passed.")
        print(f"{'='*70}\n")

        return meeting_result

    def _build_national_summary(self, state_reports: dict) -> dict:
        """Build a concise national summary from all state reports."""
        summary = {}
        for code, report in state_reports.items():
            summary[code] = {
                "name": report.get("region_name", code),
                "gdp": report.get("gdp_score", 0),
                "health": report.get("health_score", 0),
                "deficits": list(report.get("deficits", {}).keys()),
                "surpluses": list(report.get("surpluses", {}).keys()),
            }
        return summary

    def get_active_resolutions(self, current_tick: int, default_duration: int = 100) -> list:
        """Get resolutions that are still in effect."""
        active = []
        for res in self.passed_resolutions:
            tick_passed = res.get("tick_passed", 0)
            duration = res.get("proposal", {}).get("duration_ticks", default_duration)
            if current_tick - tick_passed < duration:
                active.append(res)
        return active
