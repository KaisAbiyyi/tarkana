# Security Policy

## Reporting Security Vulnerabilities

The Tarkana team takes security and player data privacy seriously. If you discover a vulnerability or security flaw, please report it responsibly so we can remediate it before public disclosure.

### How to Report

- **Email**: Send vulnerability reports directly to security@tarkana.app (or contact the repository maintainers via GitHub Security Advisories).
- **Do NOT** open a public GitHub issue for security disclosures, leaked tokens, or auth bypasses.

### What to Include

1. A clear description of the vulnerability.
2. Steps to reproduce the issue (including proof-of-concept request payloads or scripts).
3. Assessment of impact (e.g. data leak, rating tampering, privilege escalation).
4. Any proposed remediations.

### Response Timelines

- **Initial Acknowledgement**: Within 48 hours.
- **Triage and Assessment**: Within 5 business days.
- **Remediation & Advisory**: Coordinated based on severity.

## Security Principles

- **Zero Client Trust**: All scoring, ratings, correctness checks, and answer evaluation take place strictly on the server.
- **No Secret Leaks**: Correct answers and detailed explanations are never exposed to the client prior to final question submission.
- **Credential Rotation**: Any credential or token exposed in source code or client bundles will be revoked and rotated immediately.
