# skills

Lightweight collection of agent skills. Skills live under the `skills/` directory so the `skills` CLI can discover and install them.

Quick start

Install the repo's skills (from GitHub):

```bash
npx skills add seekaxis/skills
```

Install from a local checkout (dev):

```bash
npx skills add .
```

List installed skills:

```bash
npx skills list
```

Included (example)

- `skills/security-auditor` — scanner that audits skills for dangerous patterns.

Example: run the security scanner

```bash
node skills/security-auditor/scripts/scan.js --json skills/security-auditor
```

Tests

Run the scanner tests (Node.js >= 18):

```bash
node --test skills/security-auditor/tests/scan.test.js
```

Contributing

Add new skills under `skills/` with a `SKILL.md`. Keep repo README concise — each skill should document its own usage and tests.
