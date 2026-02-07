#!/usr/bin/env node

/**
 * Skill Security Auditor — Scanner
 *
 * Scans agent skill directories for dangerous patterns.
 * Usage:
 *   node scan.js <skill-directory>
 *   node scan.js --all <skills-root-directory>
 *   node scan.js --json <skill-directory>       (JSON only, no summary)
 */

const fs = require("fs");
const path = require("path");

// ── Load rules ──────────────────────────────────────────────────────────────

const RULES_PATH = path.join(__dirname, "rules.json");

function loadRules() {
  const raw = fs.readFileSync(RULES_PATH, "utf-8");
  return JSON.parse(raw);
}

// ── File discovery ──────────────────────────────────────────────────────────

const TEXT_EXTENSIONS = new Set([
  ".md", ".txt", ".json", ".yaml", ".yml", ".js", ".ts", ".mjs", ".cjs",
  ".py", ".sh", ".bash", ".zsh", ".ps1", ".rb", ".go", ".rs", ".toml",
  ".cfg", ".ini", ".html", ".xml", ".csv",
]);

const BINARY_EXTENSIONS = new Set([
  ".exe", ".dll", ".so", ".dylib", ".bin", ".dmg", ".app", ".msi",
  ".deb", ".rpm", ".appimage",
]);

function walkDir(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name.startsWith(".")) continue; // skip dotfiles
    if (entry.name === "node_modules") continue;
    if (entry.isDirectory()) {
      walkDir(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

// ── Pattern matching ────────────────────────────────────────────────────────

function matchesFileType(filePath, fileTypes) {
  if (!fileTypes || fileTypes.length === 0) return true;
  if (fileTypes.includes("*")) return true;
  const ext = path.extname(filePath);
  return fileTypes.some((ft) => {
    if (ft.startsWith("*")) return ext === ft.slice(1);
    return ext === ft;
  });
}

function scanFileContent(filePath, rules) {
  const findings = [];
  const ext = path.extname(filePath);

  // Check for bundled binaries (file-extension rule)
  if (BINARY_EXTENSIONS.has(ext)) {
    const binaryRule = rules.find((r) => r.id === "BUNDLED_BINARY");
    if (binaryRule) {
      findings.push({
        rule_id: binaryRule.id,
        severity: binaryRule.severity,
        file: filePath,
        line: 0,
        excerpt: `Binary file: ${path.basename(filePath)}`,
        pattern_matched: `extension: ${ext}`,
        remediation: binaryRule.remediation,
        confidence: "high",
      });
    }
    return findings; // Don't read binary content
  }

  // Skip non-text files
  if (!TEXT_EXTENSIONS.has(ext)) return findings;

  let content;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return findings;
  }

  const lines = content.split("\n");

  for (const rule of rules) {
    if (rule.id === "BUNDLED_BINARY") continue; // handled above
    if (!rule.patterns || rule.patterns.length === 0) continue;
    if (!matchesFileType(filePath, rule.file_types)) continue;

    for (const pattern of rule.patterns) {
      let regex;
      try {
        regex = new RegExp(pattern, "i");
      } catch {
        continue; // skip broken patterns
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (regex.test(line)) {
          // Check allowlist
          if (isAllowlisted(line)) continue;

          findings.push({
            rule_id: rule.id,
            severity: rule.severity,
            file: filePath,
            line: i + 1,
            excerpt: line.trim().substring(0, 200),
            pattern_matched: pattern,
            remediation: rule.remediation,
            confidence: deriveConfidence(rule, line),
          });
        }
      }
    }
  }

  return findings;
}

// ── Allowlist checking ──────────────────────────────────────────────────────

let _allowlists = null;

function getAllowlists() {
  if (_allowlists) return _allowlists;
  const config = loadRules();
  _allowlists = config.allowlists || { domains: [], patterns: [] };
  return _allowlists;
}

function isAllowlisted(line) {
  const al = getAllowlists();

  // Check domain allowlist — if line contains a URL with an allowlisted domain,
  // and the rule is about suspicious links, skip it
  const urlMatch = line.match(/https?:\/\/([a-zA-Z0-9.-]+)/);
  if (urlMatch) {
    const domain = urlMatch[1].toLowerCase();
    if (al.domains.some((d) => domain === d || domain.endsWith("." + d))) {
      // Only allowlist link-based rules, not command-piping rules
      // e.g. curl github.com/… | sh is still dangerous even if github.com is trusted
      if (!line.match(/\|\s*(sh|bash|zsh|dash|eval)/i)) {
        return true;
      }
    }
  }

  // Check pattern allowlists
  for (const pat of al.patterns) {
    try {
      if (new RegExp(pat, "i").test(line)) return true;
    } catch {
      /* skip */
    }
  }

  return false;
}

// ── Confidence heuristic ────────────────────────────────────────────────────

function deriveConfidence(rule, line) {
  // Inside a fenced code block instruction = higher confidence
  // Generic markdown prose = lower
  if (rule.severity === "Critical") return "high";
  if (line.match(/^```|^\$\s|^#\s*!/)) return "high";
  if (line.match(/^\s*[-*]\s/)) return "medium"; // list items
  return "medium";
}

// ── Severity ordering ───────────────────────────────────────────────────────

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function severityCompare(a, b) {
  return (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4);
}

// ── Deduplicate findings ────────────────────────────────────────────────────

function dedup(findings) {
  const seen = new Set();
  return findings.filter((f) => {
    const key = `${f.rule_id}:${f.file}:${f.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Report generation ───────────────────────────────────────────────────────

function generateReport(skillDir, findings) {
  const sorted = dedup(findings).sort(severityCompare);

  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const f of sorted) counts[f.severity] = (counts[f.severity] || 0) + 1;

  const hasCritical = counts.Critical > 0;
  const hasHigh = counts.High > 0;

  let verdict = "PASS";
  if (hasHigh) verdict = "WARN";
  if (hasCritical) verdict = "FAIL";

  return {
    skill: skillDir,
    verdict,
    summary: counts,
    total: sorted.length,
    findings: sorted.map((f) => ({
      ...f,
      file: path.relative(skillDir, f.file),
    })),
  };
}

function printSummary(report) {
  const bar = "─".repeat(60);
  console.error(`\n${bar}`);
  console.error(`  Skill Security Audit: ${path.basename(report.skill)}`);
  console.error(`${bar}`);
  console.error(`  Verdict:  ${report.verdict}`);
  console.error(
    `  Findings: ${report.total} (Critical: ${report.summary.Critical}, High: ${report.summary.High}, Medium: ${report.summary.Medium}, Low: ${report.summary.Low})`
  );

  if (report.findings.length > 0) {
    console.error(`\n  Details:`);
    for (const f of report.findings) {
      const icon =
        f.severity === "Critical"
          ? "!!"
          : f.severity === "High"
          ? "! "
          : "- ";
      console.error(
        `  ${icon} [${f.severity}] ${f.rule_id} in ${f.file}:${f.line}`
      );
      console.error(`     ${f.excerpt}`);
      console.error(`     Fix: ${f.remediation}`);
    }
  }

  console.error(`${bar}\n`);
}

// ── Main ────────────────────────────────────────────────────────────────────

function scanSkill(skillDir) {
  const config = loadRules();
  const files = walkDir(skillDir);
  const allFindings = [];

  for (const file of files) {
    const findings = scanFileContent(file, config.rules);
    allFindings.push(...findings);
  }

  return generateReport(skillDir, allFindings);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: node scan.js [--all] [--json] <skill-directory>");
    process.exit(2);
  }

  const jsonOnly = args.includes("--json");
  const scanAll = args.includes("--all");
  const targetArgs = args.filter((a) => !a.startsWith("--"));

  if (targetArgs.length === 0) {
    console.error("Error: no target directory provided.");
    process.exit(2);
  }

  const target = path.resolve(targetArgs[0]);

  if (!fs.existsSync(target)) {
    console.error(`Error: directory not found: ${target}`);
    process.exit(2);
  }

  let reports = [];

  if (scanAll) {
    // Scan each subdirectory as a separate skill
    const entries = fs.readdirSync(target, { withFileTypes: true });
    const skillDirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => path.join(target, e.name));

    if (skillDirs.length === 0) {
      console.error("No skill directories found.");
      process.exit(0);
    }

    for (const sd of skillDirs) {
      reports.push(scanSkill(sd));
    }
  } else {
    reports.push(scanSkill(target));
  }

  // Output
  const output = reports.length === 1 ? reports[0] : reports;
  console.log(JSON.stringify(output, null, 2));

  if (!jsonOnly) {
    for (const r of reports) printSummary(r);
  }

  // Exit code
  const hasCriticalOrHigh = reports.some(
    (r) => r.summary.Critical > 0 || r.summary.High > 0
  );
  process.exit(hasCriticalOrHigh ? 1 : 0);
}

main();
