import { afterEach, describe, expect, it, vi } from "vitest";

const { requestUrl } = vi.hoisted(() => ({ requestUrl: vi.fn() }));
vi.mock("obsidian", () => ({ requestUrl }));

import { fetchWritingPrompt } from "../src/api";

const settings = (provider: "anthropic" | "openai") => ({ provider, anthropicApiKeySecretId: "a", openAIApiKeySecretId: "o", pendingLegacySecretId: "", modelOverride: "", name: "", websiteUrl: "", githubUsername: "", bio: "", topics: "", additionalContext: "", outputFolder: "Muse" });

describe("provider requests", () => {
  afterEach(() => requestUrl.mockReset());
  it("uses only the selected OpenAI endpoint and bearer key", async () => {
    requestUrl.mockResolvedValue({ status: 200, json: { choices: [{ message: { content: "topic" } }] } });
    await expect(fetchWritingPrompt(settings("openai"), "openai-secret", [])).resolves.toBe("topic");
    expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({ url: "https://api.openai.com/v1/chat/completions", headers: expect.objectContaining({ Authorization: "Bearer openai-secret" }) }));
    expect(requestUrl).not.toHaveBeenCalledWith(expect.objectContaining({ url: "https://api.anthropic.com/v1/messages" }));
  });
  it("uses only the selected Anthropic endpoint and x-api-key", async () => {
    requestUrl.mockResolvedValue({ status: 200, json: { content: [{ type: "text", text: "topic" }] } });
    await expect(fetchWritingPrompt(settings("anthropic"), "anthropic-secret", [])).resolves.toBe("topic");
    expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({ url: "https://api.anthropic.com/v1/messages", headers: expect.objectContaining({ "x-api-key": "anthropic-secret" }) }));
    expect(requestUrl).not.toHaveBeenCalledWith(expect.objectContaining({ url: "https://api.openai.com/v1/chat/completions" }));
  });
});
