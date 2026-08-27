import { describe, expect, it } from "vitest";
import { migrateSettings, normalizeSettings } from "../src/settings-migration";

describe("settings migration", () => {
  it("moves a 0.2.1 plaintext key into selected provider secret and strips legacy data", async () => {
    const secrets = new Map<string, string>();
    const settings = await migrateSettings({ provider: "openai", apiKey: " legacy-key ", unknown: "discard" }, { getSecret: (id) => secrets.get(id) ?? null, setSecret: (id, value) => secrets.set(id, value) });
    expect(settings).toMatchObject({ provider: "openai", openAIApiKeySecretId: "openai-api-key" });
    expect(secrets.get("openai-api-key")).toBe("legacy-key");
    expect(JSON.stringify(settings)).not.toContain("legacy-key");
  });
  it("keeps provider secrets isolated when migrating a legacy reference", async () => {
    const settings = await migrateSettings({ provider: "openai", apiKeySecretId: "anthropic-key", anthropicApiKeySecretId: "existing-anthropic" }, { getSecret: () => "", setSecret: () => undefined });
    expect(settings.openAIApiKeySecretId).toBe("anthropic-key");
    expect(settings.anthropicApiKeySecretId).toBe("existing-anthropic");
  });
  it("normalizes invalid provider, strings, and folder", () => {
    expect(normalizeSettings({ provider: "unknown", modelOverride: 42, outputFolder: "/Muse/" })).toMatchObject({ provider: "anthropic", modelOverride: "", outputFolder: "Muse" });
  });
});
