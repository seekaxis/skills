# Agent SDK Reference

The Claude Agent SDK provides Python and TypeScript packages for full programmatic control over Claude Code. It exposes the same tools, agent loop, and context management that power Claude Code.

**Install**:

```bash
# Python
pip install claude-agent-sdk

# TypeScript
npm install @anthropic-ai/claude-agent-sdk
```

**Auth**: set `ANTHROPIC_API_KEY` as an environment variable. Also supports Amazon Bedrock (`CLAUDE_CODE_USE_BEDROCK=1`), Google Vertex AI (`CLAUDE_CODE_USE_VERTEX=1`), and Microsoft Foundry (`CLAUDE_CODE_USE_FOUNDRY=1`).

## Python SDK

### Basic Query

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="What files are in this directory?",
        options=ClaudeAgentOptions(
            allowed_tools=["Bash", "Glob"]
        )
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

### Structured Output

```python
import asyncio, json
from claude_agent_sdk import query, ClaudeAgentOptions

schema = {
    "type": "object",
    "properties": {
        "functions": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["functions"]
}

async def main():
    async for message in query(
        prompt="Extract function names from auth.py",
        options=ClaudeAgentOptions(
            allowed_tools=["Read"],
            output_format="json",
            json_schema=schema
        )
    ):
        if hasattr(message, "structured_output"):
            print(json.dumps(message.structured_output, indent=2))

asyncio.run(main())
```

### Continue a Conversation

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    session_id = None

    # First query
    async for message in query(
        prompt="Review this codebase for performance issues",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Grep", "Glob", "Bash"],
            output_format="json"
        )
    ):
        if hasattr(message, "session_id"):
            session_id = message.session_id
        if hasattr(message, "result"):
            print(message.result)

    # Follow-up using the same session
    async for message in query(
        prompt="Now focus on the database queries",
        options=ClaudeAgentOptions(
            resume=session_id,
            allowed_tools=["Read", "Grep", "Glob", "Bash"]
        )
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

### Custom System Prompt

```python
async for message in query(
    prompt="Review this diff for vulnerabilities",
    options=ClaudeAgentOptions(
        append_system_prompt="You are a security engineer. Focus on OWASP Top 10.",
        allowed_tools=["Read", "Grep"]
    )
):
    if hasattr(message, "result"):
        print(message.result)
```

### Budget and Turn Limits

```python
options = ClaudeAgentOptions(
    allowed_tools=["Read", "Edit", "Bash"],
    max_turns=5,
    max_budget_usd=2.00,
    model="sonnet"
)
```

### Load Project Settings

To use project-level CLAUDE.md, skills, and commands:

```python
options = ClaudeAgentOptions(
    setting_sources=["project"],
    allowed_tools=["Read", "Edit", "Bash"]
)
```

## TypeScript SDK

### Basic Query

```typescript
import { query, ClaudeAgentOptions } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  for await (const message of query({
    prompt: "What files are in this directory?",
    options: {
      allowedTools: ["Bash", "Glob"],
    },
  })) {
    if (message.result) {
      console.log(message.result);
    }
  }
}

main();
```

### Structured Output

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const schema = {
  type: "object",
  properties: {
    functions: { type: "array", items: { type: "string" } },
  },
  required: ["functions"],
};

for await (const message of query({
  prompt: "Extract function names from auth.py",
  options: {
    allowedTools: ["Read"],
    outputFormat: "json",
    jsonSchema: schema,
  },
})) {
  if (message.structured_output) {
    console.log(JSON.stringify(message.structured_output, null, 2));
  }
}
```

### Continue a Conversation

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

let sessionId: string | undefined;

// First query
for await (const message of query({
  prompt: "Review this codebase",
  options: { allowedTools: ["Read", "Grep", "Glob"], outputFormat: "json" },
})) {
  if (message.session_id) sessionId = message.session_id;
  if (message.result) console.log(message.result);
}

// Follow-up
for await (const message of query({
  prompt: "Now focus on error handling",
  options: { resume: sessionId, allowedTools: ["Read", "Grep", "Glob"] },
})) {
  if (message.result) console.log(message.result);
}
```

### Custom System Prompt

```typescript
for await (const message of query({
  prompt: "Review this code",
  options: {
    appendSystemPrompt: "You are a security expert. Flag any OWASP Top 10 issues.",
    allowedTools: ["Read", "Grep"],
  },
})) {
  if (message.result) console.log(message.result);
}
```

## ClaudeAgentOptions Reference

| Option | Type | Description |
|--------|------|-------------|
| `allowed_tools` / `allowedTools` | `string[]` | Tools to auto-approve |
| `disallowed_tools` / `disallowedTools` | `string[]` | Tools to remove from context |
| `tools` | `string[]` | Restrict available tools |
| `output_format` / `outputFormat` | `string` | `text`, `json`, `stream-json` |
| `json_schema` / `jsonSchema` | `object` | JSON Schema for structured output |
| `model` | `string` | Model alias or full name |
| `max_turns` / `maxTurns` | `number` | Maximum agentic turns |
| `max_budget_usd` / `maxBudgetUsd` | `number` | Maximum API spend in dollars |
| `system_prompt` / `systemPrompt` | `string` | Replace default system prompt |
| `append_system_prompt` / `appendSystemPrompt` | `string` | Append to default prompt |
| `resume` | `string` | Session ID to continue |
| `continue_conversation` / `continueConversation` | `boolean` | Continue most recent session |
| `setting_sources` / `settingSources` | `string[]` | Setting sources: `user`, `project`, `local` |
| `permission_mode` / `permissionMode` | `string` | Permission mode |
| `mcp_config` / `mcpConfig` | `string` | Path to MCP config JSON |
| `agents` | `object` | Inline subagent definitions |

## Built-in Tools

The SDK includes Claude Code's full tool set:

| Tool | Description |
|------|-------------|
| `Read` | Read file contents |
| `Write` | Create or overwrite files |
| `Edit` | Edit existing files |
| `Bash` | Execute shell commands |
| `Grep` | Search file contents with regex |
| `Glob` | Find files by pattern |
| `LS` | List directory contents |
| `Task` | Spawn subagent tasks |

## Source Documentation

- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Python SDK](https://platform.claude.com/docs/en/agent-sdk/python)
- [TypeScript SDK](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [Agent SDK Quickstart](https://platform.claude.com/docs/en/agent-sdk/quickstart)
