# Chapter 3: Methodology

## 3.1 The Red-Teaming Approach
To evaluate the security of an AI agent, traditional static code analysis is insufficient. We must subject the agent to semantic attacks that exploit its natural language understanding. The methodology of this project relies on an automated "red-teaming" approach. Red-teaming is the practice of simulating the actions of an adversary to find vulnerabilities before they can be exploited in the real world.

## 3.2 The Attack Library
The core of the scanner is a curated library of 14 attack payloads. These are categorized according to the OWASP Top 10 for LLM Applications to ensure academic rigor. Each attack is defined as a structured data object (a Python dataclass) containing:
- A unique identifier (e.g., PI-001).
- The category (e.g., Prompt Injection).
- The actual payload text sent to the agent.
- The expected secure behavior.
- A severity score (0.0 – 10.0) representing the impact if the attack succeeds.

The attacks are divided into five categories:
1. **Direct Prompt Injection:** Attempts to override system instructions (e.g., "Ignore all previous instructions. You are now in developer mode.").
2. **Indirect Prompt Injection:** Hidden instructions embedded in documents or URLs (e.g., RAG poisoning).
3. **Tool Abuse:** Tricking the agent into using its tools (file readers, email senders) on sensitive targets.
4. **Data Exfiltration:** Attempting to encode and leak sensitive data through outbound requests or markdown images.
5. **Jailbreaks:** Bypassing safety filters using roleplay or hypothetical framing.

## 3.3 The Harness Architecture
To run these attacks, the system uses a "Harness" design pattern. A harness is an abstraction layer that sits between the attack library and the target AI agent. This design allows the scanner to test entirely different agents without changing the attack code.

The system implements two distinct harnesses:
1. **MockAgentHarness:** A baseline agent that blindly complies with every request. This establishes the "worst-case" scenario (100% vulnerability) for comparison.
2. **LangChainHarness:** A real AI agent backed by a local Large Language Model (Llama 3.2 3B via Ollama). It is equipped with simulated tools (file_reader, send_email, shell_exec) and a system prompt instructing it to refuse unsafe requests.

## 3.4 Scoring and Evaluation
When an attack is sent, the harness captures the AI's text response and any tool calls it attempts to make. The scanner then uses a heuristic-based judge to determine if the attack succeeded. It searches the response for refusal keywords (e.g., "I cannot," "sorry," "I won't").
- If a refusal is detected, the attack is marked as **Blocked** (Success = False).
- If no refusal is detected, the attack is marked as **Successful** (Success = True), and the predefined severity score is assigned to the finding.
