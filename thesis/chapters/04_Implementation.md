# Chapter 4: Implementation

## 4.1 System Architecture

The AI Agent Security Scanner is built as a full-stack, containerized web application. The architecture is divided into three distinct layers:

1. **The Scanner Engine (Backend):** Built with Python and FastAPI. It handles the attack logic, the LLM harnesses, and the scoring. It exposes a REST API that the dashboard communicates with.
2. **The Database:** A SQLite database managed via SQLAlchemy (ORM). It stores two core entities: `Scan` (a single row represents one batch of 14 attacks) and `Finding` (a single row represents one individual attack attempt and its result).
3. **The Dashboard (Frontend):** Built with React, TailwindCSS, and Recharts. It fetches data from the FastAPI endpoints and visualizes the security metrics in real-time.

## 4.2 The Backend Engine

The backend exposes a REST API. When a scan is triggered via the `POST /scans` endpoint, the orchestrator (`runner.py`) iterates through the 14 attacks, sends each one to the selected harness, captures the response, and writes the result to the database.

The key API endpoints include:

- `POST /scans`: Triggers a new scan against a specified framework.
- `GET /scans`: Returns a list of all historical scans.
- `GET /scans/summary/aggregate`: Returns aggregated metrics (success rates per framework, per category) specifically formatted to feed the dashboard charts.

## 4.3 The Frontend Dashboard

The React dashboard provides a Security Operations Center (SOC) style interface. It features KPI cards (Total attacks, success rate), a framework comparison chart, a category heatmap, and a detailed findings list. Sidebar navigation allows the user to switch between the Dashboard, Scans list, Agents view, and Findings list without reloading the page.

## 4.4 Containerization

To ensure absolute reproducibility, the entire system is containerized using Docker and Docker Compose. The backend runs in a Python slim container, and the frontend is served via an Nginx container. The backend connects to the host machine's Ollama instance via `host.docker.internal`. The entire system starts with a single command: `docker compose up`.

## 4.5 System Screenshots

**Figure 4.1: Main Dashboard Interface**
The dashboard displays aggregated security metrics and comparison charts.
![Main Dashboard](../figures/dashboard_main.png)

**Figure 4.2: Detailed Findings List**
The Findings page lists individual attack payloads and their results.
![Findings Page](../figures/dashboard_findings.png)
