# Muse Rebrand + Multi-Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand "Claude Focus" to "Muse" and add OpenAI as a second AI provider alongside Anthropic.

**Architecture:** The plugin keeps its existing structure (settings, api, file, view, main). The API layer gains a provider abstraction — a shared system prompt builder feeds into provider-specific call functions selected by a settings toggle. All Claude/Anthropic-specific naming is replaced with the "Muse" brand.

**Tech Stack:** TypeScript, Obsidian API, Anthropic Messages API, OpenAI Chat Completions API, esbuild

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `manifest.json` | Modify | Plugin ID, name, description |
| `package.json` | Modify | Package name, description |
| `src/settings.ts` | Modify | Add `provider`, `modelOverride` fields; provider dropdown + model input in settings UI; adapt API key placeholder per provider |
| `src/api.ts` | Modify | Extract Anthropic call to helper, add OpenAI helper, provider switch, model override resolution |
| `src/main.ts` | Modify | Rename class, update command ID/name/ribbon text |
| `src/view.ts` | Modify | Update view type constant, body class, display text, CSS class references |
| `styles.css` | Modify | Rename all `claude-focus-` prefixes to `muse-` |
| `README.md` | Modify | Full rewrite for new name + multi-provider |

No new files are created. `src/file.ts` is untouched.

---

### Task 1: Rebrand manifest and package metadata

**Files:**
- Modify: `manifest.json` (all lines)
- Modify: `package.json:1-4`

- [ ] **Step 1: Update manifest.json**

```json
{
  "id": "muse",
  "name": "Muse",
  "version": "0.2.0",
  "minAppVersion": "1.0.0",
  "description": "Distraction-free writing with AI-generated prompts.",
  "author": "tekgadgt",
  "isDesktopOnly": false
}
```

- [ ] **Step 2: Update package.json name and description**

Change lines 2-3:
```json
  "name": "obsidian-muse",
  "description": "Distraction-free writing with AI-generated prompts.",
```

- [ ] **Step 3: Commit**

```bash
git add manifest.json package.json
git commit -m "chore: rebrand metadata to Muse"
```

---

### Task 2: Rebrand CSS classes

**Files:**
- Modify: `styles.css` (all lines)

- [ ] **Step 1: Rename all CSS class prefixes**

Replace every instance of `claude-focus-` with `muse-` and `claude-focus-zen-active` with `muse-zen-active` throughout the file. The resulting file:

```css
/* Hide all Obsidian chrome when muse mode is active */
body.muse-zen-active .workspace-ribbon,
body.muse-zen-active .sidebar-toggle-button,
body.muse-zen-active .workspace-split.mod-left-split,
body.muse-zen-active .workspace-split.mod-right-split,
body.muse-zen-active .workspace-tab-header-container,
body.muse-zen-active .status-bar,
body.muse-zen-active .titlebar,
body.muse-zen-active .view-header {
  display: none !important;
}

body.muse-zen-active .workspace-leaf {
  padding: 0 !important;
}

body.muse-zen-active .workspace-leaf-content {
  padding: 0 !important;
}

/* Muse container — full screen takeover */
.muse-zen-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: var(--background-primary);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;
}

/* Centered content wrapper */
.muse-wrapper {
  position: relative;
  width: 100%;
  max-width: 100%;
  padding: var(--size-4-8) var(--size-4-8);
  box-sizing: border-box;
}

/* Done button — subtle, top-right */
.muse-done-btn {
  position: fixed;
  top: var(--size-4-4);
  right: var(--size-4-4);
  background: transparent;
  color: var(--text-faint);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  padding: var(--size-4-1) var(--size-4-3);
  font-size: var(--font-ui-small);
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.muse-done-btn:hover {
  color: var(--text-muted);
  border-color: var(--background-modifier-border-hover);
}

.muse-done-btn:focus-visible {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
}

/* Prompt blockquote */
.muse-prompt {
  max-width: 42rem;
  margin: 0 auto var(--size-4-8) auto;
  padding-top: var(--size-4-8);
}

.muse-prompt blockquote {
  border-left: none;
  padding-left: 0;
  color: var(--text-muted);
  font-size: var(--font-ui-medium);
  line-height: 1.7;
  margin: 0;
  font-style: italic;
  text-align: center;
}

/* Writing area */
.muse-editor {
  width: 100%;
}

.muse-textarea {
  width: 100%;
  min-height: 80vh;
  background: transparent;
  border: none;
  box-shadow: none;
  outline: none;
  color: var(--text-normal);
  font-family: var(--font-text-theme);
  font-size: 1.1rem;
  line-height: 1.8;
  resize: none;
  padding: 0;
}

.muse-textarea::placeholder {
  color: var(--text-faint);
}

.muse-textarea:focus-visible {
  outline: none;
}

/* Loading state */
.muse-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100%;
  color: var(--text-muted);
  font-size: var(--font-ui-medium);
}
```

- [ ] **Step 2: Commit**

```bash
git add styles.css
git commit -m "chore: rebrand CSS classes from claude-focus to muse"
```

---

### Task 3: Rebrand view layer

**Files:**
- Modify: `src/view.ts:1-122`

- [ ] **Step 1: Update constants and CSS class references**

Change line 3-4:
```typescript
export const ZEN_VIEW_TYPE = "muse-zen";
const ZEN_ACTIVE_CLASS = "muse-zen-active";
```

Change line 23 (display text):
```typescript
    return "Muse";
```

Change line 31 (container class):
```typescript
    container.addClass("muse-zen-container");
```

Change line 34 (loading class):
```typescript
    const loadingEl = container.createDiv({ cls: "muse-loading" });
```

Change line 45 (container class in renderWritingSurface):
```typescript
    container.addClass("muse-zen-container");
```

Change line 47 (wrapper class):
```typescript
    const wrapper = container.createDiv({ cls: "muse-wrapper" });
```

Change line 50 (done button class):
```typescript
      cls: "muse-done-btn",
```

Change line 61 (prompt class):
```typescript
    const promptEl = wrapper.createDiv({ cls: "muse-prompt" });
```

Change line 65 (editor class):
```typescript
    const editorEl = wrapper.createDiv({ cls: "muse-editor" });
```

Change line 66 (textarea class):
```typescript
      cls: "muse-textarea",
```

Change line 58 (exit zen mode → exit muse mode):
```typescript
    doneBtn.addEventListener("click", () => { void this.exitMuseMode(); });
```

Change line 82-85 (escape handler calls exitMuseMode):
```typescript
        void this.exitMuseMode();
```

Rename `exitZenMode` method (line 104) to `exitMuseMode`.

- [ ] **Step 2: Build to verify no TypeScript errors**

Run: `cd /Users/tekgadgt/projects/obsidian_zen_claude_writing_prompts && npm run build`
Expected: Clean build, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/view.ts
git commit -m "chore: rebrand view layer to muse"
```

---

### Task 4: Rebrand main entry point

**Files:**
- Modify: `src/main.ts:1-115`

- [ ] **Step 1: Update imports, class name, command, and ribbon**

Change the class name on line 11:
```typescript
export default class MusePlugin extends Plugin {
```

Change command ID and name on lines 22-23:
```typescript
      id: "enter-muse-mode",
      name: "Enter muse mode",
```

Change the callback on line 24:
```typescript
      callback: () => this.activateMuseMode(),
```

Change ribbon icon tooltip and callback on lines 27-29:
```typescript
    this.addRibbonIcon("pencil", "Enter muse mode", () => {
      void this.activateMuseMode();
    });
```

Rename `activateZenMode` method (line 72) to `activateMuseMode`.

Update the error notice on line 75:
```typescript
      new Notice("Please set your API key in settings.");
```

Update the error notice on line 87:
```typescript
      new Notice("Failed to open muse view.");
```

- [ ] **Step 2: Build to verify**

Run: `cd /Users/tekgadgt/projects/obsidian_zen_claude_writing_prompts && npm run build`
Expected: Clean build.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "chore: rebrand main plugin class to Muse"
```

---

### Task 5: Update settings for multi-provider support

**Files:**
- Modify: `src/settings.ts:1-149`

- [ ] **Step 1: Add provider and modelOverride to interface and defaults**

Update the interface (lines 3-13) and defaults (lines 15-24):

```typescript
export type Provider = "anthropic" | "openai";

export interface MuseSettings {
  provider: Provider;
  apiKey: string;
  modelOverride: string;
  name: string;
  websiteUrl: string;
  githubUrl: string;
  bio: string;
  topics: string;
  additionalContext: string;
  outputFolder: string;
}

export const DEFAULT_SETTINGS: MuseSettings = {
  provider: "anthropic",
  apiKey: "",
  modelOverride: "",
  name: "",
  websiteUrl: "",
  githubUrl: "",
  bio: "",
  topics: "",
  additionalContext: "",
  outputFolder: "Muse",
};
```

- [ ] **Step 2: Rename class import and references**

Change line 2:
```typescript
import type MusePlugin from "./main";
```

Change the class declaration and constructor (lines 26-33):
```typescript
export class MuseSettingTab extends PluginSettingTab {
  plugin: MusePlugin;

  constructor(app: App, plugin: MusePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
```

- [ ] **Step 3: Add provider dropdown, update API key, add model override**

Replace the entire API section in `display()` (from the "API" heading through the API key setting) with:

```typescript
    new Setting(containerEl).setName("API").setHeading();

    new Setting(containerEl)
      .setName("Provider")
      .setDesc("Which AI service to use for generating prompts.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("anthropic", "Anthropic")
          .addOption("openai", "OpenAI") // eslint-disable-line obsidianmd/ui/sentence-case -- brand name
          .setValue(this.plugin.settings.provider)
          .onChange(async (value) => {
            this.plugin.settings.provider = value as Provider;
            await this.plugin.saveSettings();
            this.display(); // Re-render to update placeholders
          });
      });

    const apiKeyPlaceholder =
      this.plugin.settings.provider === "anthropic"
        ? "sk-ant-..."
        : "sk-...";

    new Setting(containerEl)
      .setName("API key")
      .setDesc("Your API key, stored locally in plugin data.")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder(apiKeyPlaceholder)
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          });
      });

    const defaultModel =
      this.plugin.settings.provider === "anthropic"
        ? "claude-sonnet-4-6"
        : "gpt-4o";

    new Setting(containerEl)
      .setName("Model override")
      .setDesc("Leave empty to use the default model for your provider.")
      .addText((text) =>
        text
          .setPlaceholder(defaultModel)
          .setValue(this.plugin.settings.modelOverride)
          .onChange(async (value) => {
            this.plugin.settings.modelOverride = value;
            await this.plugin.saveSettings();
          })
      );
```

- [ ] **Step 4: Update output folder placeholder**

Change the output folder placeholder (line ~141):
```typescript
          .setPlaceholder("Muse") // eslint-disable-line obsidianmd/ui/sentence-case -- folder name
```

- [ ] **Step 5: Update main.ts to use new type names**

In `src/main.ts`, update the import on line 2-6:
```typescript
import {
  MuseSettings,
  MuseSettingTab,
  DEFAULT_SETTINGS,
} from "./settings";
```

Update the settings type on line 12:
```typescript
  settings: MuseSettings = DEFAULT_SETTINGS;
```

Update the settings tab creation on line 31:
```typescript
    this.addSettingTab(new MuseSettingTab(this.app, this));
```

- [ ] **Step 6: Build to verify**

Run: `cd /Users/tekgadgt/projects/obsidian_zen_claude_writing_prompts && npm run build`
Expected: Clean build.

- [ ] **Step 7: Commit**

```bash
git add src/settings.ts src/main.ts
git commit -m "feat: add provider dropdown and model override settings"
```

---

### Task 6: Add OpenAI provider to API layer

**Files:**
- Modify: `src/api.ts:1-128`

- [ ] **Step 1: Update imports and constants**

Replace lines 1-7 with:

```typescript
import { requestUrl } from "obsidian";
import type { MuseSettings, Provider } from "./settings";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MAX_TOKENS = 300;

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
};
```

- [ ] **Step 2: Extract Anthropic call into a helper**

Add after `buildSystemPrompt` (after line 84):

```typescript
async function callAnthropic(
  systemPrompt: string,
  userMessage: string,
  model: string,
  apiKey: string
): Promise<string> {
  const response = await requestUrl({
    url: ANTHROPIC_API_URL,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (response.status !== 200) {
    const errorBody = response.json as { error?: { message?: string } };
    const message =
      errorBody?.error?.message ?? `API returned status ${response.status}`;
    throw new Error(message);
  }

  const body = response.json as {
    content?: Array<{ type: string; text?: string }>;
  };
  const textBlock = body.content?.find((block) => block.type === "text");
  if (!textBlock?.text) {
    throw new Error("No text in API response.");
  }

  return textBlock.text;
}
```

- [ ] **Step 3: Add OpenAI call helper**

Add after the Anthropic helper:

```typescript
async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  model: string,
  apiKey: string
): Promise<string> {
  const response = await requestUrl({
    url: OPENAI_API_URL,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (response.status !== 200) {
    const errorBody = response.json as { error?: { message?: string } };
    const message =
      errorBody?.error?.message ?? `API returned status ${response.status}`;
    throw new Error(message);
  }

  const body = response.json as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = body.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("No text in API response.");
  }

  return text;
}
```

- [ ] **Step 4: Rewrite fetchWritingPrompt to use provider switch**

Replace the existing `fetchWritingPrompt` function (lines 86-128) with:

```typescript
export async function fetchWritingPrompt(
  settings: MuseSettings,
  pastPrompts: string[]
): Promise<string> {
  let userMessage = "Give me a writing prompt.";
  if (pastPrompts.length > 0) {
    userMessage += "\n\nDo NOT repeat or rephrase any of these previous prompts — pick a completely different project or topic:\n";
    userMessage += pastPrompts.map((p) => `- ${p}`).join("\n");
  }

  const systemPrompt = await buildSystemPrompt(settings);
  const model = settings.modelOverride || DEFAULT_MODELS[settings.provider];

  switch (settings.provider) {
    case "openai":
      return callOpenAI(systemPrompt, userMessage, model, settings.apiKey);
    case "anthropic":
    default:
      return callAnthropic(systemPrompt, userMessage, model, settings.apiKey);
  }
}
```

- [ ] **Step 5: Update buildSystemPrompt signature**

Change line 56-58 to use new type:
```typescript
export async function buildSystemPrompt(
  settings: MuseSettings
): Promise<string> {
```

- [ ] **Step 6: Build to verify**

Run: `cd /Users/tekgadgt/projects/obsidian_zen_claude_writing_prompts && npm run build`
Expected: Clean build.

- [ ] **Step 7: Run lint**

Run: `cd /Users/tekgadgt/projects/obsidian_zen_claude_writing_prompts && npm run lint`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/api.ts
git commit -m "feat: add OpenAI provider support with provider switch"
```

---

### Task 7: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite README for new brand and multi-provider**

```markdown
# Muse

A distraction-free writing plugin for Obsidian that generates personalized blog post topics using AI. Enter muse mode, get a writing prompt based on your actual projects and interests, and start writing.

## Features

- **Muse mode** — full-screen takeover hides all Obsidian UI, leaving just your prompt and a clean writing surface
- **Personalized prompts** — pulls your real GitHub repositories and combines them with your profile to suggest specific, concrete blog post topics
- **No repeats** — remembers your recent prompts and asks for something different each time
- **Multi-provider** — works with Anthropic (Claude) or OpenAI (GPT), your choice
- **Works on mobile** — designed for desktop and mobile Obsidian, including Android with physical keyboards

## Setup

1. Install the plugin and enable it
2. Open Settings > Muse
3. Choose your AI provider (Anthropic or OpenAI)
4. Enter your API key ([Anthropic](https://console.anthropic.com/settings/keys) or [OpenAI](https://platform.openai.com/api-keys))
5. Optionally set a model override (defaults to Claude Sonnet for Anthropic, GPT-4o for OpenAI)
6. Fill in your profile — name, website, GitHub URL, bio, topics of interest, and any additional context
7. Set an output folder (defaults to `Muse/`)

## Usage

Enter muse mode via:
- **Command palette** — search "Muse: Enter muse mode"
- **Ribbon icon** — click the pencil icon in the left sidebar

A writing prompt appears at the top. Write below it. Your work is auto-saved every few seconds.

Exit by pressing **Escape** (or tapping **Done** on mobile touch).

Each session creates a new date-stamped note in your output folder (e.g., `2026-04-04.md`). The prompt is preserved as a blockquote at the top of the note.

## How it works

When you enter muse mode, the plugin:

1. Fetches your public GitHub repos for real project context
2. Reads recent prompts from your output folder to avoid repeats
3. Sends your profile + repo list + past prompts to your chosen AI provider to generate a blog post topic
4. Creates a new note with the prompt and opens the writing surface

## API usage

Each muse mode session makes:
- 1 request to the GitHub API (public, no auth needed)
- 1 request to your chosen AI provider (uses your API key, billed to your account)

The plugin uses a 300 token max per prompt, so each session costs fractions of a cent.

## Requirements

- An API key from [Anthropic](https://console.anthropic.com/settings/keys) or [OpenAI](https://platform.openai.com/api-keys)
- Obsidian 1.0.0+
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for Muse rebrand and multi-provider"
```

---

### Task 8: Final build, lint, and verify

**Files:** All

- [ ] **Step 1: Full build**

Run: `cd /Users/tekgadgt/projects/obsidian_zen_claude_writing_prompts && npm run build`
Expected: Clean build, `main.js` produced.

- [ ] **Step 2: Full lint**

Run: `cd /Users/tekgadgt/projects/obsidian_zen_claude_writing_prompts && npm run lint`
Expected: No errors.

- [ ] **Step 3: Verify no stale "claude-focus" or "Claude Focus" references remain**

Run: `grep -ri "claude.focus\|claude-focus\|ClaudeFocus" src/ manifest.json package.json styles.css README.md`
Expected: No matches (zero output).

- [ ] **Step 4: Verify main.js contains muse references**

Run: `grep -c "muse" main.js`
Expected: Multiple matches confirming rebrand applied to built output.
