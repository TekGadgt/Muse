import { Notice, Plugin, TFile, TFolder, normalizePath } from "obsidian";
import { MuseSettings, MuseSettingTab, DEFAULT_SETTINGS, migrateSettings } from "./settings";
import { fetchWritingPrompt } from "./api";
import { createZenNote } from "./file";
import { ZenWriterView, ZEN_VIEW_TYPE } from "./view";

export default class MusePlugin extends Plugin {
  settings: MuseSettings = { ...DEFAULT_SETTINGS };
  private saveQueue: Promise<void> = Promise.resolve();
  async onload(): Promise<void> { await this.loadSettings(); this.registerView(ZEN_VIEW_TYPE, (leaf) => new ZenWriterView(leaf)); this.addCommand({ id: "enter-writing-mode", name: "Enter writing mode", callback: () => this.activateMuseMode() }); this.addRibbonIcon("pencil", "Enter muse mode", () => { void this.activateMuseMode(); }); this.addSettingTab(new MuseSettingTab(this.app, this)); }
  async loadSettings(): Promise<void> { this.settings = await migrateSettings(await this.loadData(), this.app.secretStorage); await this.saveSettings(); }
  async saveSettings(): Promise<void> { const snapshot = { ...this.settings }; this.saveQueue = this.saveQueue.then(() => this.saveData(snapshot)); await this.saveQueue; }
  private getApiKey(): string { const id = this.settings.provider === "openai" ? this.settings.openAIApiKeySecretId : this.settings.anthropicApiKeySecretId; return id ? this.app.secretStorage.getSecret(id) ?? "" : ""; }
  private async getPastPrompts(): Promise<string[]> {
    const folder = this.app.vault.getAbstractFileByPath(normalizePath(this.settings.outputFolder)); if (!(folder instanceof TFolder)) return [];
    const files = folder.children.filter((child): child is TFile => child instanceof TFile && child.extension === "md").sort((a, b) => b.stat.mtime - a.stat.mtime).slice(0, 10);
    const prompts: string[] = [];
    for (const child of files) { try { const lines = (await this.app.vault.read(child)).split("\n"); const quoted: string[] = []; for (const line of lines) { if (line.startsWith("> ")) quoted.push(line.substring(2)); else break; } if (quoted.length) prompts.push(quoted.join(" ")); } catch { /* retain usable history when one note is unavailable */ } }
    return prompts;
  }
  private async activateMuseMode(): Promise<void> {
    const apiKey = this.getApiKey(); if (!apiKey) { new Notice("Please set an API key for the selected provider in settings."); return; }
    const leaf = this.app.workspace.getLeaf("tab"); await leaf.setViewState({ type: ZEN_VIEW_TYPE, active: true }); const view = leaf.view;
    if (!(view instanceof ZenWriterView)) { new Notice("Failed to open muse view."); return; }
    try { const prompt = await fetchWritingPrompt(this.settings, apiKey, await this.getPastPrompts()); const file = await createZenNote(this.app.vault, this.settings.outputFolder, prompt); view.setFile(file); view.renderWritingSurface(prompt, await this.app.vault.read(file)); }
    catch (error) { leaf.detach(); new Notice(error instanceof Error ? error.message : "An unexpected error occurred."); }
  }
}
