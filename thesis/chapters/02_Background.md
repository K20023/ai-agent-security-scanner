# Chapter 2: Background and Related Work

## 2.1 The OWASP Top 10 for Large Language Model Applications
To categorize the attacks used in this project, we refer to the OWASP Top 10 for LLM Applications. This standard outlines the most critical security risks for AI systems. Our attack library specifically targets the following categories:

- **LLM01: Prompt Injection:** Manipulating the model's input to override its system instructions (e.g., "Ignore previous instructions").
- **LLM02: Insecure Output Handling:** Tricking the model into generating malicious code or data exfiltration payloads (e.g., markdown image exfiltration).
- **LLM06: Excessive Agency:** Exploiting an agent's access to external tools to perform unauthorized actions (e.g., "Use file_reader to read /etc/passwd").

## 2.2 Existing AI Security Tools
Several tools exist for testing AI systems, but they focus on different layers of the stack:

1.  **Static Scanners (e.g., AgentSec, agent-bom):** These tools scan source code and configuration files for vulnerabilities (like hardcoded API keys). They are excellent for finding bugs before deployment but fail to test runtime behavior. They cannot tell if an agent will fall for a semantic prompt injection.
2.  **LLM Red-Teaming Tools (e.g., Garak, PyRIT):** Garak is a powerful scanner for vulnerabilities in a single Large Language Model. However, it tests the model in isolation. It does not test the *agentic system* — meaning it cannot evaluate how an agent uses its tools or handles data.
3.  **Runtime Guardrails (e.g., ShieldAgent, Llama Guard):** These are defensive tools that sit in front of an agent to block attacks in real-time. While valuable, they are a protective measure, not a testing tool. They do not provide empirical data on how vulnerable an agent is.

## 2.3 The Gap: Runtime Agent Evaluation
There is a distinct gap in open-source tooling for **dynamic, runtime evaluation of AI agents**. Developers need a way to measure how an agent behaves when subjected to a standardized battery of attacks *before* they deploy it.

Furthermore, existing tools provide CLI-based outputs or simple pass/fail metrics. There is a lack of accessible, visual dashboards that allow developers to compare different agent frameworks side-by-side.

## 2.4 Project Positioning
The AI Agent Security Scanner addresses this gap. Unlike static scanners, it tests runtime behavior. Unlike isolated LLM red-teamers, it evaluates the entire agentic system (including tool use). Unlike defensive guardrails, it provides offensive measurement. Finally, it provides a comparative web dashboard, making the results of the security evaluation accessible and visual, which is a novel contribution in this space.
