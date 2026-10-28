# Security

This Alpha is a single-user localhost application, not a remote execution service.
Prompts, Codex configuration, installed skills and project files must be trusted.
Never expose its port to a network. Host/Origin checks are defense in depth, not user authentication.
Do not enqueue secrets. Output and prompts are stored unencrypted in SQLite.
Codex can modify files according to its own permissions. This project does not bypass approval or sandbox settings.

Report suspected vulnerabilities privately through GitHub private vulnerability reporting when available. If unavailable, open a minimal issue requesting a private channel without exploit details, logs or credentials.

Supported security-fix target: latest Alpha only. No production SLA.
