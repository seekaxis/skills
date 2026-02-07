#!/usr/bin/env python3
"""Build helper — uses subprocess but with fixed commands (lower risk)."""

import subprocess
import sys

def run_build():
    """Run npm build — fixed command, no user input."""
    result = subprocess.Popen(["npm", "run", "build"], shell=True)
    result.wait()
    return result.returncode

if __name__ == "__main__":
    sys.exit(run_build())
