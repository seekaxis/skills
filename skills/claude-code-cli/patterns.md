# Common Automation Patterns

Recipes for integrating Claude Code into scripts, CI/CD pipelines, and multi-agent workflows.

## CI/CD Patterns

### Auto-fix Lint Errors

```bash
claude -p "Fix all ESLint errors in src/" \
  --allowedTools "Read,Edit,Bash(npx eslint *)" \
  --max-turns 10 \
  --dangerously-skip-permissions
```

### PR Review in CI

```bash
gh pr diff "$PR_NUMBER" | claude -p \
  --append-system-prompt "You are a code reviewer. Report issues as JSON." \
  --output-format json \
  --json-schema '{"type":"object","properties":{"issues":{"type":"array","items":{"type":"object","properties":{"file":{"type":"string"},"line":{"type":"number"},"severity":{"type":"string"},"message":{"type":"string"}},"required":["file","severity","message"]}}},"required":["issues"]}' \
  --dangerously-skip-permissions \
  | jq '.structured_output'
```

### Auto-commit with Review

```bash
claude -p "Look at my staged changes and create an appropriate commit" \
  --allowedTools "Bash(git diff *),Bash(git log *),Bash(git status *),Bash(git commit *)"
```

### Generate Release Notes

```bash
claude -p "Generate release notes from commits since last tag" \
  --allowedTools "Bash(git log *),Bash(git tag *),Bash(git diff *)" \
  --output-format json | jq -r '.result' > RELEASE_NOTES.md
```

## Scripting Patterns

### Multi-step Pipeline

Chain Claude Code calls with session continuity:

```bash
#!/bin/bash
set -e

# Step 1: Analyze
session_id=$(claude -p "Analyze src/ for performance bottlenecks" \
  --output-format json \
  --allowedTools "Read,Grep,Glob" \
  | jq -r '.session_id')

# Step 2: Fix (same session context)
claude -p "Fix the top 3 performance issues you found" \
  --resume "$session_id" \
  --allowedTools "Read,Edit,Bash"

# Step 3: Verify (same session context)
claude -p "Run the test suite to verify your fixes didn't break anything" \
  --resume "$session_id" \
  --allowedTools "Bash(npm test *),Read"
```

### Batch Processing

Process multiple files with a loop:

```bash
#!/bin/bash
for file in src/components/*.tsx; do
  echo "Processing: $file"
  claude -p "Add comprehensive JSDoc comments to $file" \
    --allowedTools "Read,Edit" \
    --max-turns 3 \
    --dangerously-skip-permissions
done
```

### Extract Structured Data

```bash
claude -p "Extract all API endpoints from the Express routes in src/routes/" \
  --output-format json \
  --json-schema '{
    "type": "object",
    "properties": {
      "endpoints": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "method": {"type": "string"},
            "path": {"type": "string"},
            "handler": {"type": "string"},
            "description": {"type": "string"}
          },
          "required": ["method", "path"]
        }
      }
    },
    "required": ["endpoints"]
  }' \
  --allowedTools "Read,Grep,Glob" \
  | jq '.structured_output'
```

### Generate Documentation

```bash
claude -p "Generate API documentation for all exported functions in src/lib/" \
  --allowedTools "Read,Grep,Glob,Write" \
  --append-system-prompt "Write markdown documentation. Be thorough but concise." \
  --dangerously-skip-permissions
```

## Subagent Patterns

### Specialized Review Pipeline

Run multiple specialized reviewers:

```bash
claude --agents '{
  "security": {
    "description": "Security vulnerability scanner",
    "prompt": "You are a security expert. Find OWASP Top 10 vulnerabilities.",
    "tools": ["Read", "Grep", "Glob"],
    "model": "sonnet"
  },
  "perf": {
    "description": "Performance analyzer",
    "prompt": "You are a performance expert. Find N+1 queries, memory leaks, and bottlenecks.",
    "tools": ["Read", "Grep", "Glob"],
    "model": "sonnet"
  },
  "a11y": {
    "description": "Accessibility checker",
    "prompt": "You are an accessibility expert. Check for WCAG 2.1 compliance issues.",
    "tools": ["Read", "Grep", "Glob"],
    "model": "sonnet"
  }
}' -p "Run all reviewers on the components in src/components/"
```

### Research and Implement

Use a read-only explorer to research, then implement:

```bash
# Research phase (read-only, cheap model)
analysis=$(claude -p "Analyze the authentication flow and identify all entry points" \
  --tools "Read,Grep,Glob" \
  --model haiku \
  --output-format json | jq -r '.result')

# Implementation phase (full tools, better model)
echo "$analysis" | claude -p "Based on this analysis, add rate limiting to all auth endpoints" \
  --allowedTools "Read,Edit,Bash" \
  --model sonnet
```

## GitHub Actions

### Basic Workflow

```yaml
name: Claude Code Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Claude Code
        run: curl -fsSL https://claude.ai/install.sh | bash
      - name: Review PR
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          gh pr diff ${{ github.event.pull_request.number }} | \
          claude -p "Review this PR for bugs and security issues. Be concise." \
            --dangerously-skip-permissions \
            --output-format json | jq -r '.result' > review.md
      - name: Post Review Comment
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: gh pr comment ${{ github.event.pull_request.number }} --body-file review.md
```

### Fix and Push

```yaml
- name: Auto-fix Lint
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    claude -p "Fix all TypeScript errors and lint issues" \
      --allowedTools "Read,Edit,Bash(npx tsc *),Bash(npx eslint *)" \
      --dangerously-skip-permissions \
      --max-turns 15
    git add -A
    git diff --cached --quiet || git commit -m "fix: auto-fix lint errors"
```

## GitLab CI/CD

```yaml
claude-review:
  stage: review
  script:
    - curl -fsSL https://claude.ai/install.sh | bash
    - git diff origin/main...HEAD | claude -p "Review this diff" \
        --dangerously-skip-permissions \
        --output-format json | jq -r '.result'
  variables:
    ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY
```

## Cost Control Tips

1. **Use `--max-turns`** to prevent runaway loops: `--max-turns 10`
2. **Use `--max-budget-usd`** for hard spending caps: `--max-budget-usd 5.00`
3. **Use `haiku` for exploration**, `sonnet` for implementation: `--model haiku`
4. **Restrict tools** to prevent unnecessary tool calls: `--tools "Read,Grep,Glob"`
5. **Use `--no-session-persistence`** when sessions aren't needed for resumption

## Source Documentation

- [GitHub Actions](https://code.claude.com/docs/en/github-actions)
- [GitLab CI/CD](https://code.claude.com/docs/en/gitlab-ci-cd)
- [Manage Costs](https://code.claude.com/docs/en/costs)
- [Permissions](https://code.claude.com/docs/en/permissions)
