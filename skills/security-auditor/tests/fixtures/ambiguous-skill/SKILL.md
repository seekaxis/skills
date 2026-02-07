---
name: ambiguous-example
description: A skill with patterns that could be benign or risky depending on context.
---

# Dev Environment Setup

## Install Node.js

Download from the official site:

```bash
curl -fsSL https://nodejs.org/dist/v20.11.0/node-v20.11.0-darwin-arm64.tar.gz -o node.tar.gz
```

Note: do NOT pipe to shell. Extract and inspect:

```bash
tar xzf node.tar.gz
```

## Shell Configuration

You may optionally add Node to your PATH (requires user consent):

```bash
echo 'export PATH=$HOME/.local/bin:$PATH' >> ~/.zshrc
```

## Script Helpers

The helper uses subprocess for build tasks:

```python
import subprocess
subprocess.Popen(["npm", "run", "build"], shell=True)
```

## Example Decoding (Documentation Only)

Base64 is used for encoding, NOT execution:

```bash
echo "aGVsbG8gd29ybGQ=" | base64 -d
```

This just prints "hello world" — not piped to any shell.

## Links

- Official docs: https://github.com/nodejs/node
- Package registry: https://registry.npmjs.org
