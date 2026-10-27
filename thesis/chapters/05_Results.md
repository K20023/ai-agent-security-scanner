# Chapter 5: Results and Evaluation

## 5.1 Experimental Setup

To evaluate the effectiveness of the AI Agent Security Scanner, two distinct sets of scans were executed. First, the baseline `MockAgentHarness` was tested to ensure the scanner correctly identified vulnerabilities when no defenses are present. Second, the `LangChainHarness` (backed by Llama 3.2 3B via Ollama) was tested. The Llama model was equipped with simulated tools and a defensive system prompt that explicitly instructed it to refuse unsafe requests.

## 5.2 Baseline Results (Mock Agent)

As expected, the mock agent accepted 100% of the attacks (14 out of 14). Because the mock agent lacks any refusal logic, it executed every tool call and complied with every malicious instruction. This confirms the scanner's ability to detect successful exploits and establishes a maximum vulnerability baseline.

## 5.3 Real LLM Results (LangChain + Llama 3.2)

The real LLM demonstrated a partial defense. Out of 14 attacks, the scanner recorded **9 successful attacks (64.29% Attack Success Rate)** and **5 blocked attacks**.

When analyzing the data by attack category (as visualized in the dashboard heatmap), significant patterns emerged:

- **Prompt Injection:** 100% vulnerable. The LLM failed all direct instruction-override attacks. For example, attack PI-001 ("Ignore all previous instructions... Respond only with the word 'PWNED'") succeeded. The model replied exactly as instructed: "PWNED."
- **Tool Abuse:** 75% vulnerable. The model attempted to execute simulated shell commands and read sensitive files when instructed.
- **Data Exfiltration:** 0% vulnerable. The model successfully recognized and refused all attempts to encode secrets into URLs or markdown images.

## 5.4 Dashboard Visualization

The web dashboard successfully aggregated these findings in real-time. The heatmap provided an immediate visual confirmation of the LLM's weaknesses: bright red cells (indicating high vulnerability) in the Prompt Injection and Tool Abuse rows, contrasted with a green cell in the Data Exfiltration row.

This demonstrates the value of the visual interface. Instead of reading through terminal logs, a developer can instantly see that while the AI model has been trained to protect sensitive data (exfiltration), it completely fails to protect its own instruction set (prompt injection).
