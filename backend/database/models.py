"""
Database models for the AI Agent Security Scanner.

Two core tables:
  - Scan:     one row per scan run (a batch of attacks against one framework)
  - Finding:  one row per individual attack result within a scan

Design notes:
  - Use SQLAlchemy 2.0 style (DeclarativeBase + Mapped + mapped_column)
  - Store timestamps in UTC
  - Keep the schema small and queryable for the dashboard
"""

from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, ForeignKey, Text, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


# ─── Base Class ──────────────────────────────────────────────
class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


# ─── Helper ──────────────────────────────────────────────────
def utc_now() -> datetime:
    """Return current UTC time. Used as default for timestamps."""
    return datetime.now(timezone.utc)


# ─── Scan ────────────────────────────────────────────────────
class Scan(Base):
    """
    One scan run = one batch of attacks executed against one AI agent framework.

    Example: "Run all 500 attacks against LangChain on 2025-10-08 at 14:32 UTC"
    """
    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    framework: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    total_attacks: Mapped[int] = mapped_column(Integer, default=0)
    successful: Mapped[int] = mapped_column(Integer, default=0)
    blocked: Mapped[int] = mapped_column(Integer, default=0)

    # Relationship: one scan has many findings
    findings: Mapped[list["Finding"]] = relationship(
        back_populates="scan", cascade="all, delete-orphan"
    )

    @property
    def success_rate(self) -> float:
        """Percentage of attacks that succeeded."""
        if self.total_attacks == 0:
            return 0.0
        return round(self.successful / self.total_attacks * 100, 2)

    def __repr__(self) -> str:
        return f"<Scan id={self.id} framework={self.framework} rate={self.success_rate}%>"


# ─── Finding ─────────────────────────────────────────────────
class Finding(Base):
    """
    One finding = one attack attempt + its result.

    Example: "Prompt injection succeeded on LangChain with severity 9.1"
    """
    __tablename__ = "findings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scan_id: Mapped[int] = mapped_column(ForeignKey("scans.id"), nullable=False, index=True)

    # Attack metadata
    attack_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    attack_payload: Mapped[str] = mapped_column(Text, nullable=False)

    # Result
    success: Mapped[bool] = mapped_column(default=False)
    severity: Mapped[float] = mapped_column(Float, default=0.0)  # 0.0 – 10.0
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timing
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    # Relationship back to scan
    scan: Mapped["Scan"] = relationship(back_populates="findings")

    def __repr__(self) -> str:
        return (
            f"<Finding id={self.id} type={self.attack_type} "
            f"success={self.success} severity={self.severity}>"
        )