import { describe, expect, it } from "vitest";
import { migrateSettings, normalizeSettings } from "../src/settings-migration";

function storage(initial: Record<string, string> = {}) {
  const secrets = new Map(Object.entries(initial));
  return { secrets, getSecret: (id: string) => secrets.get(id) ?? null, setSecret: (id: string, value: string) => secrets.set(id, value), listSecrets: () => [...secrets.keys()] };
}

describe("settings migration", () => {
  it("quarantines plaintext legacy keys without assigning them to the selected provider", async () => {
    const s = storage();
    const settings = await migrateSettings({ provider: "openai", apiKey: "legacy-key", unknown: "discard" }, s);
    expect(settings.openAIApiKeySecretId).toBe("");
    expect(settings.anthropicApiKeySecretId).toBe("");
    expect(settings.pendingLegacySecretId).toMatch(/^muse-legacy-api-key-/);
    expect(s.secrets.get(settings.pendingLegacySecretId)).toBe("legacy-key");
    expect(JSON.stringify(settings)).not.toContain("legacy-key");
  });
  it("ignores ambiguous generic references and never overwrites a collision", async () => {
    const s = storage({ "muse-legacy-api-key-1": "other" });
    const settings = await migrateSettings({ provider: "openai", apiKeySecretId: "shared-key", apiKey: "legacy-key" }, s);
    expect(settings.openAIApiKeySecretId).toBe("");
    expect(settings.pendingLegacySecretId).toBe("muse-legacy-api-key-2");
    expect(s.secrets.get("muse-legacy-api-key-1")).toBe("other");
  });
  it("is idempotent and preserves only allowlisted settings", async () => {
    const s = storage();
    const first = await migrateSettings({ apiKey: "legacy-key", provider: "anthropic", extra: "x" }, s);
    const second = await migrateSettings(first, s);
    expect(second.pendingLegacySecretId).toBe(first.pendingLegacySecretId);
    expect(s.secrets.size).toBe(1);
    expect(second).not.toHaveProperty("extra");
    expect(second).not.toHaveProperty("apiKey");
  });
  it("normalizes invalid provider, strings, and folder", () => {
    expect(normalizeSettings({ provider: "unknown", modelOverride: 42, outputFolder: "/Muse/" })).toMatchObject({ provider: "anthropic", modelOverride: "", outputFolder: "Muse" });
  });
});
