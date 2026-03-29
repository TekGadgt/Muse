import { Plugin } from "obsidian";
import { ClaudeFocusSettings, DEFAULT_SETTINGS } from "./settings";

export default class ClaudeFocusPlugin extends Plugin {
  settings: ClaudeFocusSettings = DEFAULT_SETTINGS;

  async onload() {}

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
