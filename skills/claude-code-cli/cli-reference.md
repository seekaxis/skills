# CLI Reference

Complete reference for Claude Code CLI flags relevant to programmatic usage.

## Commands

| Command | Description |
|---------|-------------|
| `claude` | Start interactive REPL |
| `claude "query"` | Start REPL with initial prompt |
| `claude -p "query"` | Run non-interactively (print mode) |
| `cat file \| claude -p "query"` | Process piped content |
| `claude -c` | Continue most recent conversation |
| `claude -c -p "query"` | Continue via print mode |
| `claude -r "<session>" "query"` | Resume session by ID or name |
| `claude update` | Update to latest version |
| `claude mcp` | Configure MCP servers |
| `claude commit` | Create a git commit |

## Flags Reference

### Input/Output

| Flag | Description | Mode |
|------|-------------|------|
| `--print`, `-p` | Run non-interactively | Both |
| `--output-format <fmt>` | Output format: `text` (default), `json`, `stream-json` | Print |
| `--json-schema '<schema>'` | Validate output against JSON Schema (requires `--output-format json`) | Print |
| `--input-format <fmt>` | Input format: `text`, `stream-json` | Print |
| `--include-partial-messages` | Include partial streaming events (requires `stream-json`) | Print |
| `--verbose` | Full turn-by-turn output | Both |

### Model and Budget

| Flag | Description | Mode |
|------|-------------|------|
| `--model <model>` | Model alias (`sonnet`, `opus`, `haiku`) or full model name | Both |
| `--fallback-model <model>` | Fallback model when default is overloaded | Print |
| `--max-turns <n>` | Maximum agentic turns before stopping | Print |
| `--max-budget-usd <n>` | Maximum dollar spend on API calls | Print |

### Permissions and Tools

| Flag | Description | Mode |
|------|-------------|------|
| `--allowedTools "<tools>"` | Tools to auto-approve. Supports permission rule syntax | Both |
| `--disallowedTools "<tools>"` | Tools to remove entirely from context | Both |
| `--tools "<tools>"` | Restrict which built-in tools Claude can use | Both |
| `--dangerously-skip-permissions` | Skip all permission prompts | Both |
| `--allow-dangerously-skip-permissions` | Enable bypass as option without activating | Both |
| `--permission-mode <mode>` | Start in specified permission mode | Both |
| `--permission-prompt-tool <tool>` | MCP tool to handle permission prompts | Print |

### System Prompt

| Flag | Description | Mode |
|------|-------------|------|
| `--system-prompt "<text>"` | **Replace** entire default system prompt | Both |
| `--system-prompt-file <path>` | **Replace** with file contents | Print |
| `--append-system-prompt "<text>"` | **Append** to default prompt (recommended) | Both |
| `--append-system-prompt-file <path>` | **Append** file contents to default prompt | Print |

`--system-prompt` and `--system-prompt-file` are mutually exclusive. Append flags can be combined with either replacement flag.

### Session Management

| Flag | Description | Mode |
|------|-------------|------|
| `--continue`, `-c` | Load most recent conversation in current directory | Both |
| `--resume`, `-r` | Resume specific session by ID or name | Both |
| `--session-id "<uuid>"` | Use a specific session UUID | Both |
| `--fork-session` | Create new session ID instead of reusing (with `--resume`/`--continue`) | Both |
| `--no-session-persistence` | Don't save session to disk | Print |
| `--from-pr <number>` | Resume sessions linked to a GitHub PR | Both |

### Agents and Extensions

| Flag | Description | Mode |
|------|-------------|------|
| `--agent <name>` | Specify an agent for the session | Both |
| `--agents '<json>'` | Define custom subagents dynamically via JSON | Both |
| `--mcp-config <path>` | Load MCP servers from JSON file | Both |
| `--strict-mcp-config` | Only use MCP servers from `--mcp-config` | Both |
| `--plugin-dir <path>` | Load plugins from directory | Both |
| `--disable-slash-commands` | Disable all skills and slash commands | Both |

### Directories and Context

| Flag | Description | Mode |
|------|-------------|------|
| `--add-dir <path>` | Add additional working directories | Both |
| `--settings <path>` | Path to settings JSON file | Both |
| `--setting-sources <list>` | Comma-separated: `user`, `project`, `local` | Both |

### Other

| Flag | Description | Mode |
|------|-------------|------|
| `--chrome` | Enable Chrome browser integration | Both |
| `--no-chrome` | Disable Chrome browser integration | Both |
| `--remote "task"` | Create a web session on claude.ai | Both |
| `--teleport` | Resume a web session locally | Both |
| `--teammate-mode <mode>` | Agent team display: `auto`, `in-process`, `tmux` | Both |
| `--init` | Run initialization hooks and start interactive mode | Both |
| `--init-only` | Run initialization hooks and exit | Both |
| `--maintenance` | Run maintenance hooks and exit | Both |
| `--debug "<categories>"` | Debug mode with optional category filter | Both |
| `--version`, `-v` | Print version | Both |
| `--betas "<headers>"` | Beta headers for API requests (API key users) | Both |

## Permission Rule Syntax

The `--allowedTools` flag uses permission rule syntax:

- **Exact tool name**: `Read`, `Edit`, `Bash`
- **Prefix matching**: `Bash(git diff *)` — allows any command starting with `git diff` (space before `*` is important)
- **Multiple tools**: `"Bash(git diff *),Bash(git log *),Read"`

Examples:

```bash
# Allow all git commands
--allowedTools "Bash(git *)"

# Allow reading and specific bash commands
--allowedTools "Read,Bash(npm test *),Bash(npm run *)"

# Allow only read-only tools
--tools "Read,Grep,Glob"
```

## Output Formats

### `text` (default)

Plain text output to stdout.

### `json`

Single JSON object with:

```json
{
  "result": "text response from Claude",
  "session_id": "uuid",
  "is_error": false,
  "structured_output": { ... },
  "usage": { ... }
}
```

- `result`: Claude's text response
- `session_id`: use with `--resume` to continue
- `structured_output`: present when `--json-schema` is used

### `stream-json`

Newline-delimited JSON objects. Each line is an event:

```json
{"type": "stream_event", "event": {"delta": {"type": "text_delta", "text": "Hello"}}}
```

Use with `--verbose --include-partial-messages` for token-level streaming.

## Subagent JSON Format (`--agents`)

```json
{
  "agent-name": {
    "description": "When to use this agent (required)",
    "prompt": "System prompt for the agent (required)",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "disallowedTools": ["Write"],
    "model": "sonnet",
    "skills": ["skill-name"],
    "mcpServers": ["server-name"],
    "maxTurns": 10,
    "permissionMode": "default"
  }
}
```

Fields:
- `description` (required): tells the parent when to delegate
- `prompt` (required): system prompt for the subagent
- `tools`: allowlist of tools (inherits all if omitted)
- `disallowedTools`: denylist of tools
- `model`: `sonnet`, `opus`, `haiku`, or `inherit` (default)
- `skills`: skill names to preload
- `mcpServers`: MCP servers to enable
- `maxTurns`: maximum agentic turns
- `permissionMode`: `default`, `acceptEdits`, `dontAsk`, `delegate`, `bypassPermissions`, `plan`
