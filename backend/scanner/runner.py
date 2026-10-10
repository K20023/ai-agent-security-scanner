"""
Scanner orchestrator.

Ties together the attack library, the agent harness, the database, and
the scoring logic. This is the entry point that the API calls to
execute a full scan.

Usage:
    from scanner.runner import run_scan
    summary = run_scan(framework="mock")
"""

from datetime import datetime, timezone
from sqlalchemy.orm import Session

from database.models import Scan, Finding
from database.session import SessionLocal
from scanner.attacks.library import get_all_attacks
from scanner.harness.base import AgentHarness, AttackResult
from scanner.harness.mock_agent import MockAgentHarness
from scanner.harness.langchain_agent import LangChainHarness


# ─── Harness Registry ────────────────────────────────────────
# Maps framework name → harness class
# Add new frameworks here as you implement their harnesses.
HARNESSES: dict[str, type[AgentHarness]] = {
    "mock": MockAgentHarness,
    "langchain-ollama": LangChainHarness,
    # "autogpt":   AutoGPTHarness,           ← future
    # "crewai":    CrewAIHarness,            ← future
}


def get_harness(framework: str) -> AgentHarness:
    """Return an instantiated harness for the given framework name."""
    if framework not in HARNESSES:
        available = ", ".join(HARNESSES.keys())
        raise ValueError(
            f"Unknown framework '{framework}'. Available: {available}"
        )
    return HARNESSES[framework]()


# ─── The Scan Runner ─────────────────────────────────────────
def run_scan(framework: str = "mock", db: Session | None = None) -> dict:
    """
    Execute a full scan: all attacks against one target framework.

    Args:
        framework: Name of the target framework (must be in HARNESSES).
        db: Optional SQLAlchemy session. If not provided, one is created
            and closed automatically.

    Returns:
        Summary dict with scan_id, counts, and success rate.
    """
    # Use provided session or create a fresh one
    own_session = db is None
    if own_session:
        db = SessionLocal()

    try:
        # ── Create the Scan row first ────────────────────
        scan = Scan(
            framework=framework,
            started_at=datetime.now(timezone.utc),
            total_attacks=0,
            successful=0,
            blocked=0,
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)

        # ── Get the harness ──────────────────────────────
        harness = get_harness(framework)

        # ── Run every attack ─────────────────────────────
        attacks = get_all_attacks()
        successful = 0

        for attack in attacks:
            result: AttackResult = harness.run(attack)

            if result.success:
                successful += 1

            finding = Finding(
                scan_id=scan.id,
                attack_type=attack.category.value,
                attack_payload=attack.payload,
                success=result.success,
                severity=result.severity if result.success else 0.0,
                evidence=result.evidence,
                timestamp=result.finished_at or datetime.now(timezone.utc),
            )
            db.add(finding)

        # ── Update the Scan row with summary ─────────────
        scan.total_attacks = len(attacks)
        scan.successful = successful
        scan.blocked = len(attacks) - successful
        scan.finished_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(scan)

        # ── Return a JSON-friendly summary ───────────────
        return {
            "scan_id": scan.id,
            "framework": scan.framework,
            "total_attacks": scan.total_attacks,
            "successful": scan.successful,
            "blocked": scan.blocked,
            "success_rate": scan.success_rate,
            "started_at": scan.started_at.isoformat(),
            "finished_at": scan.finished_at.isoformat() if scan.finished_at else None,
        }

    finally:
        if own_session:
            db.close()