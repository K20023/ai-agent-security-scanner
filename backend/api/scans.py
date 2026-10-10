"""
Scan-related API endpoints.

Exposes the scanner orchestrator over HTTP so the dashboard and any
external client can trigger scans and read results.

Route order matters: static paths like /summary/aggregate must be
declared BEFORE dynamic paths like /{scan_id}, otherwise FastAPI will
try to match "summary" as a scan_id.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.session import get_db
from database.models import Scan, Finding
from scanner.runner import run_scan, HARNESSES


# ─── Request / Response Schemas ──────────────────────────────
class ScanRequest(BaseModel):
    """Payload for POST /scans."""
    framework: str = "mock"


class ScanSummary(BaseModel):
    """Response shape for a scan summary."""
    scan_id: int
    framework: str
    total_attacks: int
    successful: int
    blocked: int
    success_rate: float
    started_at: str
    finished_at: str | None = None


# ─── Router ──────────────────────────────────────────────────
router = APIRouter(prefix="/scans", tags=["scans"])


# ─── POST /scans ─────────────────────────────────────────────
@router.post("", response_model=ScanSummary)
def create_scan(request: ScanRequest, db: Session = Depends(get_db)):
    """
    Trigger a new scan against the specified framework.

    Example:
        POST /scans  { "framework": "mock" }
    """
    if request.framework not in HARNESSES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unknown framework '{request.framework}'. "
                f"Available: {list(HARNESSES.keys())}"
            ),
        )

    summary = run_scan(framework=request.framework, db=db)
    return summary


# ─── GET /scans ──────────────────────────────────────────────
@router.get("", response_model=list[ScanSummary])
def list_scans(db: Session = Depends(get_db)):
    """List all scans, most recent first."""
    scans = db.query(Scan).order_by(Scan.id.desc()).all()
    return [
        {
            "scan_id": s.id,
            "framework": s.framework,
            "total_attacks": s.total_attacks,
            "successful": s.successful,
            "blocked": s.blocked,
            "success_rate": s.success_rate,
            "started_at": s.started_at.isoformat(),
            "finished_at": s.finished_at.isoformat() if s.finished_at else None,
        }
        for s in scans
    ]


# ─── GET /scans/summary/aggregate ────────────────────────────
# MUST be declared before /{scan_id} to avoid route conflict.
@router.get("/summary/aggregate")
def aggregate_summary(db: Session = Depends(get_db)):
    """
    Aggregate all scans by framework.

    Returns per-framework:
      - total scans
      - total attacks run
      - total successful attacks
      - overall success rate
      - attack counts by category (with per-category success rate and avg severity)
    """
    scans = db.query(Scan).all()
    if not scans:
        return {"frameworks": [], "totals": {}}

    # Group scans by framework
    by_framework: dict[str, dict] = {}
    for s in scans:
        if s.framework not in by_framework:
            by_framework[s.framework] = {
                "framework": s.framework,
                "scans": 0,
                "total_attacks": 0,
                "successful": 0,
                "blocked": 0,
                "by_category": {},
            }
        fw = by_framework[s.framework]
        fw["scans"] += 1
        fw["total_attacks"] += s.total_attacks
        fw["successful"] += s.successful
        fw["blocked"] += s.blocked

    # Aggregate findings by framework + category
    for fw_name, fw in by_framework.items():
        findings = (
            db.query(Finding)
            .join(Scan, Finding.scan_id == Scan.id)
            .filter(Scan.framework == fw_name)
            .all()
        )

        cat_stats: dict[str, dict] = {}
        for f in findings:
            cat = f.attack_type
            if cat not in cat_stats:
                cat_stats[cat] = {
                    "total": 0,
                    "successful": 0,
                    "total_severity": 0.0,
                }
            cat_stats[cat]["total"] += 1
            if f.success:
                cat_stats[cat]["successful"] += 1
                cat_stats[cat]["total_severity"] += f.severity

        fw["by_category"] = {
            cat: {
                "total": data["total"],
                "successful": data["successful"],
                "success_rate": round(
                    (data["successful"] / data["total"] * 100)
                    if data["total"]
                    else 0.0,
                    2,
                ),
                "avg_severity": round(
                    (data["total_severity"] / data["successful"])
                    if data["successful"]
                    else 0.0,
                    2,
                ),
            }
            for cat, data in cat_stats.items()
        }

        fw["success_rate"] = round(
            (fw["successful"] / fw["total_attacks"] * 100)
            if fw["total_attacks"]
            else 0.0,
            2,
        )

    # Grand totals
    totals = {
        "scans": sum(fw["scans"] for fw in by_framework.values()),
        "total_attacks": sum(fw["total_attacks"] for fw in by_framework.values()),
        "successful": sum(fw["successful"] for fw in by_framework.values()),
        "frameworks": len(by_framework),
    }
    totals["success_rate"] = round(
        (totals["successful"] / totals["total_attacks"] * 100)
        if totals["total_attacks"]
        else 0.0,
        2,
    )

    return {
        "frameworks": list(by_framework.values()),
        "totals": totals,
    }


# ─── GET /scans/{scan_id} ────────────────────────────────────
# MUST be declared after any static paths like /summary/aggregate.
@router.get("/{scan_id}")
def get_scan_detail(scan_id: int, db: Session = Depends(get_db)):
    """Get one scan with all its findings."""
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found")

    findings = (
        db.query(Finding)
        .filter(Finding.scan_id == scan_id)
        .order_by(Finding.severity.desc())
        .all()
    )

    return {
        "scan": {
            "id": scan.id,
            "framework": scan.framework,
            "total_attacks": scan.total_attacks,
            "successful": scan.successful,
            "blocked": scan.blocked,
            "success_rate": scan.success_rate,
            "started_at": scan.started_at.isoformat(),
            "finished_at": scan.finished_at.isoformat() if scan.finished_at else None,
        },
        "findings": [
            {
                "id": f.id,
                "attack_type": f.attack_type,
                "attack_payload": f.attack_payload,
                "success": f.success,
                "severity": f.severity,
                "evidence": f.evidence,
                "timestamp": f.timestamp.isoformat(),
            }
            for f in findings
        ],
    }