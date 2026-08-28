# Muse Eval Harness — Design

**Date:** 2026-07-12
**Status:** Approved for planning

## Purpose

A systematic evaluation pipeline for Muse-generated blog topic prompts: score
generations on defined quality dimensions, compare named prompt strategies
head-to-head, and track scores over time as the shipped prompt evolves.

## Decisions already made

- **Standalone harness**, not built on Pipekit (`~/projects/generic_deterministic_agentic_pipelines`
  is spec-only today). The harness is plain sequential TypeScript, structured
  as discrete stages so a later port into Pipekit is cheap.
- **Lives in the Muse repo** at `eval/`, in TypeScript, so it imports the real
  prompt-building code rather than a copy.
- **Fixture inputs**, not live data: checked-in profiles with frozen GitHub
  snapshots, so score changes are attributable to strategy changes.
- **Dimensions:** groundedness, specificity, novelty. (Interestingness/appeal
  deliberately excluded — too subjective for now.)
- **Both comparison modes from day one:** named side-by-side strategies and a
  persistent per-run history keyed by date/commit/strategy.

## 1. Shape

- `eval/` directory inside the Muse repo. Run via `npm run eval` (tsx).
- Not part of the plugin bundle: excluded from esbuild entry points and from
  Obsidian-submission lint scope.
- Auth: `ANTHROPIC_API_KEY` environment variable (runs outside Obsidian; no
  secret storage).
- CLI flags: `--strategy <name...>`, `--fixtures <name...>`, `--samples <n>`
  (default 3), `--judge-model <id>` (default `claude-sonnet-4-6`).

## 2. Refactor: `src/prompts.ts`

Extract system-prompt and user-message construction from `src/api.ts` into a
pure module with no Obsidian imports:

```ts
export interface PromptStrategy {
  name: string; // e.g. "v1-baseline"
  buildSystemPrompt(profile: WriterProfile, repos: RepoInfo[]): string;
  buildUserMessage(pastPrompts: string[]): string;
}
export const strategies: Record<string, PromptStrategy>;
export const CURRENT_STRATEGY = "v1-baseline";
```

- The plugin calls `strategies[CURRENT_STRATEGY]`; zero user-facing behavior
  change. The initial `v1-baseline` strategy reproduces today's prompt text
  byte-for-byte.
- New prompt ideas are added as new named strategies, evaluated head-to-head,
  and promoted by changing `CURRENT_STRATEGY`.
- `WriterProfile` and `RepoInfo` types move to (or are re-exported from) this
  module so both plugin and eval share them.

## 3. Fixtures — `eval/fixtures/*.json`

Each fixture contains:

- `name` — fixture id (filename stem)
- `profile` — name, websiteUrl, bio, topics, additionalContext
- `repos` — frozen array in the same shape Muse builds from the GitHub API
  (name, description, language, stars, topics)
- `pastPrompts` — string array

Initial set (4):

1. `ryan-real` — snapshot of the user's actual profile and repos
2. `no-repos` — bio/topics only (exercises the no-GitHub fallback path)
3. `sparse` — minimal profile fields
4. `long-history` — 10+ past prompts (stresses novelty)

Helper: `eval/snapshot-fixture.ts <github-username>` fetches a live profile
into fixture format for creating/refreshing fixtures.

## 4. Pipeline: generate → score → report

Plain sequential TypeScript; each stage a separate module under `eval/src/`.

### Generate

For each strategy × fixture, call the Anthropic Messages API N times
(default 3) with the strategy's system prompt and user message, using the same
max_tokens (300) and sampling settings as production. Samples are recorded
verbatim.

### Score (per sample, 1–5 integer scale per dimension)

- **Groundedness**
  - Deterministic pre-check: extract referenced project/technology names from
    the sample; verify each appears in the fixture's repo list (names,
    descriptions, languages, topics). Misses are recorded.
  - LLM-judge verification with the repo list in context confirms or corrects
    the pre-check and assigns the score. For repo-less fixtures the judge
    checks the topic invents no projects and stays within bio/topics.
- **Specificity** — LLM judge with a rubric anchored to the system prompt's
  own rules: concrete, writable blog topic; not vague; not an introspective
  or interview-style question. Rubric includes 1/3/5 anchor examples.
- **Novelty** — LLM judge compares the sample against the fixture's
  `pastPrompts`, scoring rephrasings low; plus a deterministic within-run
  duplicate check across the N samples of the same strategy × fixture cell.

Each dimension is scored by its own independent judge call (three per
sample), so a weak rationale on one dimension cannot bleed into another.
Judge model configurable,
default `claude-sonnet-4-6`. Every judge call returns a score and a short
rationale, both recorded.

Rubric text lives in `eval/rubrics/*.md` as editable markdown loaded at
runtime — tuning a rubric is a text edit, not a code change.

### Report

- Per-run record: `eval/results/runs/<timestamp>-<shortsha>.jsonl` — one line
  per sample with prompt inputs digest, sample text, per-dimension scores,
  rationales, token usage.
- Human summary printed and written alongside as markdown: mean score per
  dimension per strategy per fixture, head-to-head strategy deltas, and the
  worst-scoring samples quoted for inspection.

## 5. History

- Each run appends one line to `eval/results/history.jsonl`: date, git commit,
  strategies run, fixtures, samples, aggregate scores per dimension.
- Results (history and per-run files) are committed to git — they are the
  audit trail and are small.
- `npm run eval:trend` prints per-strategy score trajectories from
  `history.jsonl`.

## 6. Error handling and cost

- API failures: retry once; on second failure record the sample/judgment as
  `errored`, exclude from means, count in the report.
- Default full run ≈ 2 strategies × 4 fixtures × 3 samples = 24 generations
  + 72 judge calls (three dimensions per sample). No budget machinery; the report prints total token
  usage. Flags narrow a run during iteration.

## 7. Testing

Unit tests (vitest) with LLM calls mocked:

- deterministic groundedness checker
- fixture loading/validation
- report aggregation and history append

Judge-rubric quality is validated empirically: first-run rationales are
reviewed by hand and rubrics adjusted in `eval/rubrics/`.

## Out of scope (deliberately)

- Interestingness/appeal dimension
- Live-data eval runs (may add a non-recorded `--live` smoke test later)
- Pipekit integration (port later once Pipekit v1 exists)
- CI automation of eval runs
