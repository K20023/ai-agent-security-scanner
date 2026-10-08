"""
AI Agent Security Scanner — API entry point.

This is the main FastAPI application that will serve:
- Scan orchestration endpoints
- Findings and results endpoints
- Dashboard data endpoints

Run with: uvicorn api.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ─── Application Instance ────────────────────────────────────
app = FastAPI(
    title="AI Agent Security Scanner",
    description="Unified benchmarking platform for AI agent security",
    version="0.1.0",
)

# ─── CORS ────────────────────────────────────────────────────
# Allows the React frontend (running on a different port) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health Check ────────────────────────────────────────────
@app.get("/")
def root():
    """Root endpoint — confirms the API is alive."""
    return {
        "name": "AI Agent Security Scanner",
        "version": "0.1.0",
        "status": "operational",
    }


@app.get("/health")
def health():
    """Health check endpoint — used by monitoring and Docker."""
    return {"status": "healthy"}