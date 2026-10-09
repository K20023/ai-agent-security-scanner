"""
Scan-related API endpoints.

Exposes the scanner orchestrator over HTTP so the dashboard and any
external client can trigger scans and read results.
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


# ─── GET /scans/{scan_id} ────────────────────────────────────
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