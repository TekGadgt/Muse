import { App, PluginSettingTab, SecretComponent, Setting } from "obsidian";
import type MusePlugin from "./main";
import type { MuseSettings, Provider } from "./settings-migration";
export { DEFAULT_SETTINGS, migrateSettings, normalizeSettings } from "./settings-migration";
export type { MuseSettings, Provider } from "./settings-migration";
const PROVIDER_LABELS: Record<Provider, string> = { anthropic: "Anthropic", openai: "OpenAI" };

export class MuseSettingTab extends PluginSettingTab {
  plugin: MusePlugin;
  constructor(app: App, plugin: MusePlugin) { super(app, plugin); this.plugin = plugin; }
  display(): void {
    const { containerEl } = this; containerEl.empty();
    new Setting(containerEl).setName("API").setHeading();
    new Setting(containerEl).setName("Provider").setDesc("Which AI service to use for generating prompts.").addDropdown((dropdown) => {
      for (const [value, label] of Object.entries(PROVIDER_LABELS)) dropdown.addOption(value, label);
      dropdown.setValue(this.plugin.settings.provider).onChange(async (value) => { this.plugin.settings.provider = value as Provider; await this.plugin.saveSettings(); this.display(); });
    });
    new Setting(containerEl).setName("API key").setDesc("Your API key, stored securely in obsidian's secret storage.").addComponent((el) => {
      const secret = new SecretComponent(this.app, el); const key = this.plugin.settings.provider === "openai" ? "openAIApiKeySecretId" : "anthropicApiKeySecretId";
      if (this.plugin.settings[key]) secret.setValue(this.plugin.settings[key]);
      secret.onChange(async (secretId) => { this.plugin.settings[key] = secretId; await this.plugin.saveSettings(); }); return secret;
    });
    this.addTextSetting(containerEl, "Model override", "Leave empty to use the default model for your provider.", "modelOverride");
    new Setting(containerEl).setName("Profile").setHeading();
    this.addTextSetting(containerEl, "Name", "Your name, so prompts can address you personally.", "name");
    this.addTextSetting(containerEl, "Website / blog URL", "", "websiteUrl");
    this.addTextSetting(containerEl, "GitHub username", "Used to fetch your public repos for prompt context.", "githubUsername");
    this.addTextSetting(containerEl, "Bio / about", "A short description of who you are and what you do.", "bio", true);
    this.addTextSetting(containerEl, "Topics of interest", "Comma-separated list of topics you write about.", "topics");
    this.addTextSetting(containerEl, "Additional context", "Anything else — tone preferences, goals, what you want to write about.", "additionalContext", true);
    new Setting(containerEl).setName("Output").setHeading();
    this.addTextSetting(containerEl, "Output folder", "Folder where new writing notes are created.", "outputFolder");
  }
  private addTextSetting(containerEl: HTMLElement, name: string, desc: string, key: keyof MuseSettings, area = false): void {
    new Setting(containerEl).setName(name).setDesc(desc).addText((text) => text.setValue(this.plugin.settings[key]).onChange(async (value) => { this.plugin.settings[key] = value as never; await this.plugin.saveSettings(); }));
  }
}
