#!/usr/bin/env node

/**
 * Skill Security Auditor — Test Suite
 *
 * Uses Node.js built-in test runner (node --test).
 * Requires Node.js >= 18.
 *
 * Run:  pnpm test
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const SCAN = path.join(__dirname, "..", "scripts", "scan.js");
const FIXTURES = path.join(__dirname, "fixtures");

function runScan(skillDir, extraArgs = []) {
  try {
    const stdout = execFileSync(
      "node",
      [SCAN, "--json", ...extraArgs, skillDir],
      { encoding: "utf-8", timeout: 15_000 }
    );
    return { report: JSON.parse(stdout), exitCode: 0 };
  } catch (err) {
    // Non-zero exit still produces stdout
    if (err.stdout) {
      return { report: JSON.parse(err.stdout), exitCode: err.status };
    }
    throw err;
  }
}

// ── Safe Skill ──────────────────────────────────────────────────────────────

describe("safe-skill fixture", () => {
  it("should produce zero findings and PASS verdict", () => {
    const { report, exitCode } = runScan(path.join(FIXTURES, "safe-skill"));
    assert.equal(report.verdict, "PASS");
    assert.equal(report.total, 0);
    assert.equal(report.findings.length, 0);
    assert.equal(exitCode, 0);
  });
});

// ── Risky Skill ─────────────────────────────────────────────────────────────

describe("risky-skill fixture", () => {
  let report;
  let exitCode;

  it("should load and produce a FAIL verdict", () => {
    const result = runScan(path.join(FIXTURES, "risky-skill"));
    report = result.report;
    exitCode = result.exitCode;

    assert.equal(report.verdict, "FAIL");
    assert.equal(exitCode, 1);
    assert.ok(report.total > 0, "should have findings");
  });

  it("should detect CURL_PIPE", () => {
    const result = runScan(path.join(FIXTURES, "risky-skill"));
    const ids = result.report.findings.map((f) => f.rule_id);
    assert.ok(ids.includes("CURL_PIPE"), "should detect curl piped to shell");
  });

  it("should detect BASE64_EXEC", () => {
    const result = runScan(path.join(FIXTURES, "risky-skill"));
    const ids = result.report.findings.map((f) => f.rule_id);
    assert.ok(ids.includes("BASE64_EXEC"), "should detect base64 decoded and executed");
  });

  it("should detect QUARANTINE_RM", () => {
    const result = runScan(path.join(FIXTURES, "risky-skill"));
    const ids = result.report.findings.map((f) => f.rule_id);
    assert.ok(ids.includes("QUARANTINE_RM"), "should detect quarantine removal");
  });

  it("should detect BINARY_EXEC", () => {
    const result = runScan(path.join(FIXTURES, "risky-skill"));
    const ids = result.report.findings.map((f) => f.rule_id);
    assert.ok(ids.includes("BINARY_EXEC"), "should detect binary download-and-execute");
  });

  it("should detect SECRET_ACCESS", () => {
    const result = runScan(path.join(FIXTURES, "risky-skill"));
    const ids = result.report.findings.map((f) => f.rule_id);
    assert.ok(ids.includes("SECRET_ACCESS"), "should detect credential access");
  });

  it("should detect SUSPICIOUS_LINK", () => {
    const result = runScan(path.join(FIXTURES, "risky-skill"));
    const ids = result.report.findings.map((f) => f.rule_id);
    assert.ok(ids.includes("SUSPICIOUS_LINK"), "should detect suspicious links");
  });

  it("should detect POSTINSTALL", () => {
    const result = runScan(path.join(FIXTURES, "risky-skill"));
    const ids = result.report.findings.map((f) => f.rule_id);
    assert.ok(ids.includes("POSTINSTALL"), "should detect postinstall abuse");
  });

  it("should detect DEPENDENCY_REDIR", () => {
    const result = runScan(path.join(FIXTURES, "risky-skill"));
    const ids = result.report.findings.map((f) => f.rule_id);
    assert.ok(ids.includes("DEPENDENCY_REDIR"), "should detect dependency redirection");
  });

  it("should detect PATH_MODIFY", () => {
    const result = runScan(path.join(FIXTURES, "risky-skill"));
    const ids = result.report.findings.map((f) => f.rule_id);
    assert.ok(ids.includes("PATH_MODIFY"), "should detect PATH/rc modification");
  });
});

// ── Ambiguous Skill ─────────────────────────────────────────────────────────

describe("ambiguous-skill fixture", () => {
  it("should produce findings but no Critical-level ones from SKILL.md links", () => {
    const { report } = runScan(path.join(FIXTURES, "ambiguous-skill"));
    // Ambiguous skill has context-dependent patterns (subprocess with shell=True, PATH modify)
    // It should NOT flag the safe curl download (no pipe to shell)
    const curlPipe = report.findings.filter((f) => f.rule_id === "CURL_PIPE");
    assert.equal(curlPipe.length, 0, "should not flag curl that downloads to file");
  });

  it("should flag subprocess shell=True as EVAL_EXEC", () => {
    const { report } = runScan(path.join(FIXTURES, "ambiguous-skill"));
    const evalFindings = report.findings.filter((f) => f.rule_id === "EVAL_EXEC");
    assert.ok(evalFindings.length > 0, "should flag subprocess with shell=True");
  });

  it("should flag PATH modification in zshrc", () => {
    const { report } = runScan(path.join(FIXTURES, "ambiguous-skill"));
    const pathMod = report.findings.filter((f) => f.rule_id === "PATH_MODIFY");
    assert.ok(pathMod.length > 0, "should flag >> ~/.zshrc");
  });
});

// ── --all mode ──────────────────────────────────────────────────────────────

describe("--all mode", () => {
  it("should scan all fixtures and return array of reports", () => {
    const { report, exitCode } = runScan(FIXTURES, ["--all"]);
    assert.ok(Array.isArray(report), "should return array of reports");
    assert.equal(report.length, 3, "should scan 3 fixture skills");

    const names = report.map((r) => path.basename(r.skill)).sort();
    assert.deepEqual(names, ["ambiguous-skill", "risky-skill", "safe-skill"]);

    // At least one report should FAIL (risky-skill)
    assert.ok(report.some((r) => r.verdict === "FAIL"), "risky-skill should FAIL");
    // Safe skill should PASS
    assert.ok(report.some((r) => r.verdict === "PASS"), "safe-skill should PASS");

    // Exit code should be 1 because risky-skill has Critical findings
    assert.equal(exitCode, 1);
  });
});

// ── Report schema ───────────────────────────────────────────────────────────

describe("report schema", () => {
  it("should have correct schema for each finding", () => {
    const { report } = runScan(path.join(FIXTURES, "risky-skill"));

    for (const finding of report.findings) {
      assert.ok(typeof finding.rule_id === "string", "rule_id should be string");
      assert.ok(
        ["Critical", "High", "Medium", "Low"].includes(finding.severity),
        `severity should be valid: ${finding.severity}`
      );
      assert.ok(typeof finding.file === "string", "file should be string");
      assert.ok(typeof finding.line === "number", "line should be number");
      assert.ok(typeof finding.excerpt === "string", "excerpt should be string");
      assert.ok(typeof finding.pattern_matched === "string", "pattern_matched should be string");
      assert.ok(typeof finding.remediation === "string", "remediation should be string");
      assert.ok(
        ["high", "medium", "low"].includes(finding.confidence),
        `confidence should be valid: ${finding.confidence}`
      );
    }
  });

  it("findings should be sorted by severity (Critical first)", () => {
    const { report } = runScan(path.join(FIXTURES, "risky-skill"));
    const severities = report.findings.map((f) => f.severity);
    const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };

    for (let i = 1; i < severities.length; i++) {
      assert.ok(
        order[severities[i]] >= order[severities[i - 1]],
        `findings should be sorted: ${severities[i - 1]} before ${severities[i]}`
      );
    }
  });
});
