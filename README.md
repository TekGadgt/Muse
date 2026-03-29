# Claude Focus

A distraction-free writing plugin for Obsidian that generates personalized blog post topics using the Claude API. Enter zen mode, get a writing prompt based on your actual projects and interests, and start writing.

## Features

- **Zen mode** — full-screen takeover hides all Obsidian UI, leaving just your prompt and a clean writing surface
- **Personalized prompts** — pulls your real GitHub repositories and combines them with your profile to suggest specific, concrete blog post topics
- **No repeats** — remembers your recent prompts and asks Claude for something different each time
- **Works on mobile** — designed for desktop and mobile Obsidian, including Android with physical keyboards

## Setup

1. Install the plugin and enable it
2. Open Settings > Claude Focus
3. Enter your [Anthropic API key](https://console.anthropic.com/settings/keys)
4. Fill in your profile — name, website, GitHub URL, bio, topics of interest, and any additional context
5. Set an output folder (defaults to `Claude Focus/`)

## Usage

Enter zen mode via:
- **Command palette** — search "Claude Focus: Enter zen mode"
- **Ribbon icon** — click the pencil icon in the left sidebar

A writing prompt appears at the top. Write below it. Your work is auto-saved every few seconds.

Exit by pressing **Escape** (or tapping **Done** on mobile touch).

Each session creates a new date-stamped note in your output folder (e.g., `2026-03-29.md`). The prompt is preserved as a blockquote at the top of the note.

## How it works

When you enter zen mode, the plugin:

1. Fetches your public GitHub repos for real project context
2. Reads recent prompts from your output folder to avoid repeats
3. Sends your profile + repo list + past prompts to Claude (Sonnet) to generate a blog post topic
4. Creates a new note with the prompt and opens the zen writing surface

## API usage

Each zen mode session makes:
- 1 request to the GitHub API (public, no auth needed)
- 1 request to the Anthropic Messages API (uses your API key, billed to your account)

The plugin uses Claude Sonnet with a 300 token max, so each prompt costs fractions of a cent.

## Requirements

- An [Anthropic API key](https://console.anthropic.com/settings/keys)
- Obsidian 1.0.0+
