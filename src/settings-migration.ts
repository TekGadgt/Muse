export type Provider = "anthropic" | "openai";
export interface MuseSettings {
  provider: Provider;
  anthropicApiKeySecretId: string;
  openAIApiKeySecretId: string;
  pendingLegacySecretId: string;
  modelOverride: string;
  name: string;
  websiteUrl: string;
  githubUsername: string;
  bio: string;
  topics: string;
  additionalContext: string;
  outputFolder: string;
}
export const DEFAULT_SETTINGS: MuseSettings = { provider: "anthropic", anthropicApiKeySecretId: "", openAIApiKeySecretId: "", pendingLegacySecretId: "", modelOverride: "", name: "", websiteUrl: "", githubUsername: "", bio: "", topics: "", additionalContext: "", outputFolder: "Muse" };
const KEYS = Object.keys(DEFAULT_SETTINGS) as Array<keyof MuseSettings>;
const stringValue = (value: unknown, fallback: string): string => typeof value === "string" ? value.trim() : fallback;
export function normalizeSettings(raw: unknown): MuseSettings {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const result = { ...DEFAULT_SETTINGS, provider: data.provider === "openai" ? "openai" as const : "anthropic" as const };
  for (const key of KEYS) if (key !== "provider") (result as unknown as Record<string, string>)[key] = stringValue(data[key], DEFAULT_SETTINGS[key]);
  result.outputFolder = result.outputFolder.replace(/^\/+|\/+$/g, "");
  return result;
}

type SecretStorage = { getSecret(id: string): string | null; setSecret(id: string, secret: string): void; listSecrets?: () => string[] };
function occupied(storage: SecretStorage, id: string): boolean { return (storage.listSecrets?.() ?? []).includes(id) || storage.getSecret(id) !== null; }
function nextLegacyId(storage: SecretStorage): string { for (let n = 1; ; n++) { const id = `muse-legacy-api-key-${n}`; if (!occupied(storage, id)) return id; } }

export async function migrateSettings(raw: unknown, secretStorage: SecretStorage): Promise<MuseSettings> {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const settings = normalizeSettings(data);
  // Generic legacy references have no trustworthy provider provenance. Do not assign them.
  settings.anthropicApiKeySecretId = stringValue(data.anthropicApiKeySecretId, "");
  settings.openAIApiKeySecretId = stringValue(data.openAIApiKeySecretId, "");
  const existingPending = stringValue(data.pendingLegacySecretId, "");
  if (existingPending && occupied(secretStorage, existingPending)) {
    settings.pendingLegacySecretId = existingPending;
    settings.anthropicApiKeySecretId = stringValue(data.anthropicApiKeySecretId, "");
    settings.openAIApiKeySecretId = stringValue(data.openAIApiKeySecretId, "");
    return settings;
  }
  const legacyKey = stringValue(data.apiKey, "");
  if (legacyKey) {
    const id = nextLegacyId(secretStorage);
    secretStorage.setSecret(id, legacyKey);
    settings.pendingLegacySecretId = id;
  } else if (existingPending) {
    settings.pendingLegacySecretId = existingPending;
  }
  return settings;
}

export function linkPendingLegacySecret(settings: MuseSettings, provider: Provider, secretStorage: SecretStorage): MuseSettings {
  if (!settings.pendingLegacySecretId || !secretStorage.getSecret(settings.pendingLegacySecretId)) return settings;
  const next = { ...settings, provider, pendingLegacySecretId: "" };
  if (provider === "openai") next.openAIApiKeySecretId = settings.pendingLegacySecretId;
  else next.anthropicApiKeySecretId = settings.pendingLegacySecretId;
  return next;
}
