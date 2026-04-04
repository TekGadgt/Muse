# Muse — Rebrand + Multi-Provider Design

## Overview

Rebrand "Claude Focus" to "Muse" (AI-company-agnostic) and add OpenAI as a second provider option alongside Anthropic. Prepare for Obsidian plugin marketplace submission.

## Naming & Identity

- Plugin ID: `muse`
- Display name: "Muse"
- Command: "Muse: Enter muse mode"
- Command ID: `enter-muse-mode`
- Ribbon tooltip: "Enter muse mode"
- CSS class prefix: `muse-`
- Body class: `muse-zen-active`
- View type: `muse-zen`
- Default output folder: `Muse/`

## Settings Changes

### New fields

- `provider`: `"anthropic" | "openai"` — dropdown selector, defaults to `"anthropic"`
- `modelOverride`: `string` — optional text input, empty by default

### Updated fields

- `apiKey` — description becomes provider-agnostic ("Your API key, stored locally in plugin data.")
- `apiKey` — placeholder adapts per provider (`sk-ant-...` for Anthropic, `sk-...` for OpenAI)
- `outputFolder` — default changes from `"Claude Focus"` to `"Muse/"`

### Default models per provider

- Anthropic: `claude-sonnet-4-6`
- OpenAI: `gpt-4o`

### Settings UI layout

1. **API** heading
   - Provider dropdown (Anthropic / OpenAI)
   - API key (password field, placeholder adapts to provider)
   - Model override (text field, placeholder shows default for selected provider)
2. **Profile** heading (unchanged)
   - Name, Website, GitHub, Bio, Topics, Additional context
3. **Output** heading (unchanged)
   - Output folder (default placeholder updates to "Muse")

## API Layer

### Architecture

`fetchWritingPrompt(settings, pastPrompts)` remains the single public entry point. Internally it delegates based on `settings.provider`:

- `callAnthropic(systemPrompt, userMessage, model, apiKey)` — existing Messages API path
- `callOpenAI(systemPrompt, userMessage, model, apiKey)` — new Chat Completions path

`buildSystemPrompt(settings)` is shared across both providers — same prompt, same GitHub fetching.

### OpenAI integration

- Endpoint: `https://api.openai.com/v1/chat/completions`
- Auth header: `Authorization: Bearer <key>`
- Request body: `{ model, max_tokens: 300, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }] }`
- Response parsing: `response.choices[0].message.content`
- Error handling: same pattern as Anthropic (401 → invalid key, 429 → rate limited)

### Model resolution

```
effective_model = settings.modelOverride || DEFAULT_MODEL_FOR_PROVIDER[settings.provider]
```

## File Changes

| File | Changes |
|------|---------|
| `manifest.json` | id → `muse`, name → `Muse`, description updated |
| `package.json` | name updated |
| `src/settings.ts` | Add `provider` + `modelOverride` to interface/defaults, add provider dropdown + model override input to settings tab, adapt API key placeholder per provider |
| `src/api.ts` | Extract Anthropic call into helper, add OpenAI helper, switch on provider, apply model override, share `buildSystemPrompt` |
| `src/main.ts` | Rename class to `MusePlugin`, update command ID/name ("enter-muse-mode" / "Enter muse mode"), update ribbon tooltip |
| `src/view.ts` | Update `ZEN_VIEW_TYPE` to `muse-zen`, update `ZEN_ACTIVE_CLASS` to `muse-zen-active`, update display text to "Muse", update CSS class references |
| `src/file.ts` | No changes needed |
| `styles.css` | Rename all `claude-focus-` prefixes to `muse-` |
| `README.md` | Full rewrite — new name, multi-provider docs, updated setup instructions |

## What Stays the Same

- Zen/muse mode UX (full-screen takeover, escape to exit, auto-save, Done button)
- GitHub repo fetching for project context
- Past prompt deduplication (read blockquotes from output folder)
- File creation with date-stamped notes and counter suffix
- Mobile support (requestUrl, 44px touch targets)
- System prompt content and structure

## Out of Scope

- Marketplace submission (separate follow-up)
- Additional providers beyond Anthropic/OpenAI
- Streaming responses
