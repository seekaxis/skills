# skills

Agent Skills

This repository provides a "Skill Security Auditor" and is structured to be compatible with the `skills` CLI (npx skills). Placeable skills live under the `skills/` directory so the CLI can discover them.

Included skill
- `skills/security-auditor` — a scanner that audits agent skills for dangerous patterns (malicious installers, obfuscated payloads, credential exfiltration, supply-chain risks).

Quick usage
- Run the scanner directly:

```bash
node scripts/scan.js ./skills/security-auditor
```

- Scan all skills under a directory and emit JSON:

```bash
node scripts/scan.js --all ./skills --json > audit-report.json
```

Using the `skills` CLI
- The `skills` CLI discovers skills in `skills/` and other conventional locations. To list installed skills:

```bash
npx skills list
```

To add this repo's skills to your agents (interactive):

```bash
npx skills add .
```

Development & tests
- Tests live under `skills/security-auditor/tests`. Run them with Node.js:

```bash
node --test skills/security-auditor/tests/scan.test.js
```

Notes
- The primary implementation lives under `skills/security-auditor` (scripts, rules, fixtures). Keep `scripts/rules.json` updated to tune allowlists and rules.
*** End Patch
