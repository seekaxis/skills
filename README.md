# skills

Lightweight collection of agent skills for AI coding assistants.

## Install

Install all skills from this repo:

```bash
npx skills add seekaxis/skills
```

Install from a local checkout (for development):

```bash
npx skills add .
```

List installed skills:

```bash
npx skills list
```

### Manual install

Alternatively, copy a skill directory into your agent's skills folder:

| Agent | Personal skills path | Project skills path |
|-------|---------------------|---------------------|
| **Claude Code** | `~/.claude/skills/<skill-name>/` | `.claude/skills/<skill-name>/` |
| **Cursor** | `~/.cursor/skills/<skill-name>/` | `.cursor/skills/<skill-name>/` |
| **Codex** | `~/.codex/skills/<skill-name>/` | `.codex/skills/<skill-name>/` |

Example — install `claude-code-cli` for Claude Code (personal, all projects):

```bash
cp -r skills/claude-code-cli ~/.claude/skills/claude-code-cli
```

Or for a single project:

```bash
cp -r skills/claude-code-cli .claude/skills/claude-code-cli
```

## Available Skills

| Skill | Description | Install |
|-------|-------------|---------|
| **security-auditor** | Audit agent skills for dangerous patterns, obfuscated payloads, and supply-chain attacks | `npx skills add https://github.com/seekaxis/skills --skill security-auditor` |
| **claude-code-cli** | Use Claude Code programmatically from scripts, CI/CD, Python, or TypeScript | `npx skills add https://github.com/seekaxis/skills --skill claude-code-cli` |

---

### `security-auditor`

Scans agent skill directories for dangerous patterns — malicious installers, obfuscated payloads, credential exfiltration, and supply-chain attacks.

```bash
npx skills add https://github.com/seekaxis/skills --skill security-auditor
```

```bash
# Scan a single skill
node skills/security-auditor/scripts/scan.js skills/security-auditor

# Scan with JSON output
node skills/security-auditor/scripts/scan.js --json skills/security-auditor

# Scan all skills in a directory
node skills/security-auditor/scripts/scan.js --all ./skills
```

Run tests (Node.js >= 18):

```bash
node --test skills/security-auditor/tests/scan.test.js
```

---

### `claude-code-cli`

Teaches AI agents how to use Claude Code programmatically — from shell scripts, CI/CD pipelines, Python, or TypeScript.

```bash
npx skills add https://github.com/seekaxis/skills --skill claude-code-cli
```

**What it covers:**

- **CLI print mode** (`claude -p`) — run tasks non-interactively with structured JSON or streaming output
- **Agent SDK** — Python and TypeScript packages for full programmatic control
- **Session management** — continue and resume conversations across invocations
- **Subagents** — define and orchestrate specialized agents inline or via files
- **Agent teams** — coordinate multiple Claude Code instances working in parallel
- **CI/CD patterns** — ready-to-use recipes for GitHub Actions, GitLab CI/CD, and shell scripts

**Skill files:**

| File | Contents |
|------|----------|
| `SKILL.md` | Quick start, core concepts, and navigation |
| `cli-reference.md` | Complete CLI flags, output formats, permission syntax |
| `agent-sdk.md` | Python and TypeScript SDK with examples |
| `patterns.md` | CI/CD recipes, scripting patterns, cost control tips |

**Quick example** — run a one-shot task from any script:

```bash
claude -p "Find and fix the bug in auth.py" --allowedTools "Read,Edit,Bash"
```

**Quick example** — Python SDK:

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="Find and fix the bug in auth.py",
        options=ClaudeAgentOptions(allowed_tools=["Read", "Edit", "Bash"])
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

## Contributing

Add new skills under `skills/` with a `SKILL.md`. Each skill should document its own usage within its `SKILL.md`. Keep this README concise — link to the skill's own docs for details.
