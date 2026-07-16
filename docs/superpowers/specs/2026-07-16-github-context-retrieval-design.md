# Expanded GitHub Context Retrieval — Design

**Date:** 2026-07-16
**Status:** Approved for planning
**Depends on:** [Muse Eval Harness](2026-07-12-muse-eval-harness-design.md) — specifically the `src/prompts.ts` extraction, the `PromptStrategy` registry, and the fixture pipeline. Phase A of this spec cannot start until those exist.

## Purpose

Muse-generated blog topics are surface-level because the model receives almost
nothing per project: repo name, one-line description, language. This spec
enriches the context with README excerpts and recent commit subjects for the
writer's most active repositories, so generated topics can reference what the
writer actually built and recently did — not just what their repos are called.

## Decisions already made

- **Richer GitHub context, not local directory reading.** The writer's
  projects live on GitHub; local filesystem access would be desktop-only and
  a community-review liability for no additional coverage.
- **REST only.** GitHub GraphQL could batch everything into one request but
  requires auth unconditionally, forcing two parallel fetch paths. Caching
  makes REST cheap enough. GraphQL is a later optimization if ever needed.
- **Eval-first sequencing.** The enriched context ships as a new named prompt
  strategy (`v2-rich-context`) evaluated head-to-head against `v1-baseline`
  before any live plugin behavior changes. `CURRENT_STRATEGY` flips only on a
  measured win.
- **Per-repo context: README excerpt + recent commit subjects.** Releases
  excluded — most personal repos have none; a wasted call.
- **Enrichment set: pinned repos + most recently pushed, 5 total.** Pins take
  slots from the automatic selection.
- **Optional PAT** stored in Obsidian secret storage. Unauthenticated remains
  the zero-setup default.

## 1. Context model

`RepoInfo` (in `src/prompts.ts`, shared by plugin and eval) gains optional
enrichment fields:

```ts
export interface RepoInfo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  topics: string[];
  pushedAt: string;          // ISO date, now captured for all repos
  readme?: string;           // enriched repos only: excerpt, ≤1500 chars
  recentCommits?: string[];  // enriched repos only: ≤10 commit subject lines
}
```

- **README excerpt:** raw markdown from `GET /repos/{owner}/{repo}/readme`
  (`Accept: application/vnd.github.raw+json`), truncated to 1500 characters at
  the nearest line break. Badge/image-only leading lines stripped.
- **Recent commits:** subject lines (first line of `commit.message`) from
  `GET /repos/{owner}/{repo}/commits?per_page=10`. Merge commits
  (subject starts with `Merge `) skipped, not replaced.
- Budget: with 5 enriched repos, enrichment adds ≤ ~2,500 tokens of context.
  No further cap needed at this scale.

## 2. Enrichment selection

- Candidate pool: the existing repo list fetch, changed from `sort=updated`
  to `sort=pushed` (code activity, not metadata edits), non-forks only.
- Enriched set = pinned repos first (in the order pinned), then the most
  recently pushed candidates to fill to **5 total**.
- A pinned repo not in the candidate pool (older than the 20 most recently
  pushed) is fetched individually via `GET /repos/{owner}/{repo}` and still
  enriched.
- All candidate repos continue to appear in the prompt as the shallow
  one-line list; enrichment is additive.

## 3. Plugin changes

### New module: `src/github.ts`

All GitHub fetching moves out of `src/api.ts` into `src/github.ts`:

- `fetchRepoContext(settings, pat, cache): Promise<{ repos: RepoInfo[]; cache: RepoContextCache }>`
  — returns the shallow list with the enriched set populated, plus the
  updated cache to persist.
- Pure helpers (selection logic, README truncation, cache invalidation) are
  exported for unit testing; only the fetch wrapper touches `requestUrl`.

### Settings (`src/settings.ts`)

Two additions under the existing GitHub username field:

- **GitHub token** — optional, `SecretComponent`, stored as
  `githubPatSecretId` (same pattern as the AI key). Description states what
  it unlocks: higher rate limits and private repositories.
- **Pinned repositories** — optional text field `pinnedRepos`, comma-separated
  repo names (bare `name` resolves against the configured username;
  `owner/name` accepted for repos owned elsewhere).

### Auth behavior

- PAT present: send `Authorization: Bearer <token>`, and fetch the candidate
  list from `GET /user/repos?sort=pushed&per_page=20&affiliation=owner`
  (includes private repos). PAT absent: current
  `GET /users/{username}/repos` endpoint, public only.
- Rate budget check: unauthenticated worst case (cold cache) is 1 list call +
  5×2 enrichment calls = 11 of 60/hour, plus 1 per pinned repo outside the
  candidate pool. Warm cache: 1–3 calls per session.

### Caching

- Cache lives in `data.json` alongside settings: the persisted object becomes
  `MuseSettings & { repoContextCache?: RepoContextCache }`. The existing
  `Object.assign` load path carries it with no migration.
- Shape: `{ [fullName]: { pushedAt, readme, commitSubjects, fetchedAt } }`.
- Invalidation: a repo's entry is stale iff its `pushedAt` in the fresh list
  differs from the cached `pushedAt`. No TTL — an unpushed repo serves from
  cache indefinitely, which is correct.
- Pruning: after each fetch, entries not in the current enriched set are
  dropped, capping the cache at 5 entries.

## 4. Prompt strategy: `v2-rich-context`

New named strategy in `src/prompts.ts` alongside `v1-baseline`:

- Shallow repo list rendered as today.
- Below it, a `Recently active projects:` section — per enriched repo: name,
  description, then `README excerpt:` and `Recent commits:` blocks.
- The groundedness instruction ("only reference projects listed above")
  extends to explicitly permit referencing specific features, decisions, and
  changes that appear in README excerpts and commit subjects.
- The topic-suggestion instruction is biased toward recent activity: prefer
  topics anchored in what the commits show the writer recently doing.

`v1-baseline` is untouched. `CURRENT_STRATEGY` stays `v1-baseline` until the
promotion gate passes.

## 5. Phase A — eval before plugin

1. Extend the fixture schema: `repos` entries accept the new optional fields.
   Existing fixtures remain valid (fields are optional).
2. Update `eval/snapshot-fixture.ts` to fetch enrichment data (honoring a
   `GITHUB_TOKEN` env var) so `ryan-real` can be re-snapshotted rich.
3. Add a `rich` fixture variant of `ryan-real`; keep the lean version to
   verify `v2-rich-context` degrades sensibly on enrichment-less input.
4. Run `v1-baseline` vs `v2-rich-context` across fixtures.
5. **Promotion gate:** `v2-rich-context` must beat `v1-baseline` on
   specificity, with no regression on groundedness or novelty, on the rich
   fixture. Iterate on the strategy text (new strategy names) until the gate
   passes or the approach is judged a dead end.

## 6. Phase B — plugin wiring (after the gate passes)

1. Implement `src/github.ts` with cache + selection.
2. Add the two settings.
3. `src/api.ts` calls `fetchRepoContext` and hands `RepoInfo[]` to the
   current strategy; plugin persists the returned cache.
4. Flip `CURRENT_STRATEGY` to the winning strategy.
5. Update README: new settings, revised API-usage section (call counts,
   what is sent to the AI provider — including that README/commit text from
   private repos is sent if a PAT is configured).

## 7. Error handling

- Any enrichment call failing (404 no README, 403/429 rate limit, network):
  that repo falls back to shallow info; generation proceeds. Never block a
  writing session on enrichment.
- On 403/429 specifically, skip all remaining enrichment calls for the
  session and serve whatever the cache has.
- Invalid PAT (401): `Notice` suggesting the token be checked, then proceed
  unauthenticated this session.

## 8. Testing

Unit tests (vitest, no network):

- Enrichment selection: pins-first fill to 5, bare vs `owner/name` parsing,
  pinned repo outside candidate pool.
- Cache invalidation on `pushedAt` change; pruning to the enriched set.
- README truncation at line break; badge-line stripping; merge-commit
  filtering.

Quality is validated by the Phase A eval run, not by unit tests.

## Out of scope (deliberately)

- GraphQL fetching
- Releases, issues, PRs as context sources
- Local project directory reading (revisit only if off-GitHub work becomes
  significant)
- Enriched-repo count as a user setting (fixed at 5 until evidence says
  otherwise)
