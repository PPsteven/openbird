---
name: spec-design
description: |
  Initialize a new project with spec-driven structure. Creates AGENTS.md, architecture.md, status.md, D0-reference.md, and numbered D-specs (D1, D2, ...) — each with verification, core code, design rationale, edge cases, and data model. Use when starting a new project, restructuring an existing one, or writing D-specs. Triggers on "set up spec-driven", "initialize project", "create D-specs", "project setup for AI".
---

# Spec-Driven Design

Initialize a project so any AI agent can resume work by reading files in a fixed order.

## File Structure

```
project/
├── AGENTS.md              # Entry: rules + mermaid workflow + spec order + conventions
└── docs/
    ├── D0-reference.md    # Reference target (read-only)
    ├── D1-xxx.md          # Spec 1
    ├── D2-xxx.md          # Spec 2
    ├── architecture.md    # Project foundation, tech decisions, dev environment
    └── status.md          # Progress tracking
```

## Setup Workflow

### Step 1: Understand the Project

Ask the user:
1. What is the project? (one-line description)
2. What is the reference target? (product to clone, API to match)
3. What are the deliverable milestones, in implementation order?
4. What tech stack and conventions?

### Step 2: Create AGENTS.md

Copy `assets/AGENTS.md.template` to project root. Fill placeholders:
- `{PROJECT_NAME}`, `{ONE_LINE_DESCRIPTION}`
- `{SPEC_TABLE}` — rows like `| 1 | [docs/D1-worker.md] | worker/ 可部署 | wrangler deploy + curl |`
- `{CONVENTIONS}` — key-value table
- `{FILE_TREE}` — expected final directory structure

The mermaid flowchart must be included.

### Step 3: Create architecture.md

Copy `assets/architecture.md.template` to `docs/architecture.md`. Fill in: project foundation, architecture, tech decisions table, tech stack, dev environment, constraints.

### Step 4: Create status.md

Copy `assets/status.md.template` to `docs/status.md`. Fill in: current focus, progress checklist, next steps.

### Step 5: Create D0-reference.md

Copy `assets/D0-reference.md.template` to `docs/D0-reference.md`. Document the target product's interface, constraints, limits, and error formats. Mark it read-only.

### Step 6: Create D-Specs

For each milestone, copy `assets/DN-spec.md.template` to `docs/DN-short-name.md`. A D-spec has five mandatory sections:

1. **验证标准** — Exact copy-paste commands with expected output. This is the contract.
2. **文件结构** — What files to create, where, and why.
3. **核心代码** — Function signatures, key logic, data structures. Code templates, not prose.
4. **设计说明** — Why this approach, flow diagrams, edge case handling table.
5. **数据模型** — JSON structures, KV key patterns, DB schemas.

### Step 7: Confirm

Show the final file listing to the user.

## D-Spec Writing Rules

- **Code over prose**: Write function signatures, JSON shapes, logic flows.
- **Design rationale always**: Every non-trivial decision needs a "why".
- **Edge cases upfront**: Table of "scenario → handling".
- **Verification is the contract**: If verification commands pass, the spec is done.
- **Numbered in implementation order**: D0 is always reference.
- **Self-contained**: One D-spec should not need another to implement (except declared deps).
