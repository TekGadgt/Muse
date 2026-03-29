import { App, PluginSettingTab, Setting } from "obsidian";
import type ClaudeFocusPlugin from "./main";

export interface ClaudeFocusSettings {
  apiKey: string;
  name: string;
  websiteUrl: string;
  githubUrl: string;
  bio: string;
  topics: string;
  additionalContext: string;
  outputFolder: string;
}

export const DEFAULT_SETTINGS: ClaudeFocusSettings = {
  apiKey: "",
  name: "",
  websiteUrl: "",
  githubUrl: "",
  bio: "",
  topics: "",
  additionalContext: "",
  outputFolder: "Claude Focus",
};

export class ClaudeFocusSettingTab extends PluginSettingTab {
  plugin: ClaudeFocusPlugin;

  constructor(app: App, plugin: ClaudeFocusPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("API").setHeading();

    new Setting(containerEl)
      .setName("API key")
      .setDesc("Your Anthropic API key, stored locally in plugin data.") // eslint-disable-line obsidianmd/ui/sentence-case -- proper nouns
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("sk-ant-...") // eslint-disable-line obsidianmd/ui/sentence-case -- API key format
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl).setName("Profile").setHeading();

    new Setting(containerEl)
      .setName("Name")
      .setDesc("Your name, so prompts can address you personally.")
      .addText((text) =>
        text
          .setPlaceholder("Jane")
          .setValue(this.plugin.settings.name)
          .onChange(async (value) => {
            this.plugin.settings.name = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Website / blog URL")
      .addText((text) =>
        text
          .setPlaceholder("https://example.com")
          .setValue(this.plugin.settings.websiteUrl)
          .onChange(async (value) => {
            this.plugin.settings.websiteUrl = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("GitHub / portfolio URL")
      .addText((text) =>
        text
          .setPlaceholder("https://github.com/username")
          .setValue(this.plugin.settings.githubUrl)
          .onChange(async (value) => {
            this.plugin.settings.githubUrl = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Bio / about")
      .setDesc("A short description of who you are and what you do.")
      .addTextArea((text) =>
        text
          .setPlaceholder("I'm a software engineer who...")
          .setValue(this.plugin.settings.bio)
          .onChange(async (value) => {
            this.plugin.settings.bio = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Topics of interest")
      .setDesc("Comma-separated list of topics you write about.")
      .addText((text) =>
        text
          .setPlaceholder("rust, web dev, gardening") // eslint-disable-line obsidianmd/ui/sentence-case -- example values
          .setValue(this.plugin.settings.topics)
          .onChange(async (value) => {
            this.plugin.settings.topics = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Additional context")
      .setDesc(
        "Anything else — tone preferences, goals, what you want to write about."
      )
      .addTextArea((text) =>
        text
          .setPlaceholder("I want to write more casually about my projects...")
          .setValue(this.plugin.settings.additionalContext)
          .onChange(async (value) => {
            this.plugin.settings.additionalContext = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Output").setHeading();

    new Setting(containerEl)
      .setName("Output folder")
      .setDesc("Folder where new writing notes are created.")
      .addText((text) =>
        text
          .setPlaceholder("Claude Focus") // eslint-disable-line obsidianmd/ui/sentence-case -- folder name
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
