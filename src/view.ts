import { ItemView, WorkspaceLeaf, TFile, Notice } from "obsidian";

export const ZEN_VIEW_TYPE = "muse-zen";
const ZEN_ACTIVE_CLASS = "muse-zen-active";

export class ZenWriterView extends ItemView {
  private file: TFile | null = null;
  private textareaEl: HTMLTextAreaElement | null = null;
  private saveInterval: number | null = null;
  private promptHeader = "";
  private lastSavedValue = "";
  private ownerDocument: Document | null = null;
  private ownerWindow: Window | null = null;

  constructor(leaf: WorkspaceLeaf) { super(leaf); }
  getViewType(): string { return ZEN_VIEW_TYPE; }
  getDisplayText(): string { return "Muse"; }
  async onOpen(): Promise<void> {
    this.ownerDocument = this.containerEl.ownerDocument;
    this.ownerWindow = this.ownerDocument.defaultView;
    this.ownerDocument.body.addClass(ZEN_ACTIVE_CLASS);
    this.containerEl.empty(); this.containerEl.addClass("muse-zen-container");
    const loading = this.containerEl.createDiv({ cls: "muse-loading" }); loading.createSpan({ text: "Fetching your writing prompt..." }); loading.setAttribute("role", "status"); loading.setAttribute("aria-live", "polite");
  }
  renderWritingSurface(prompt: string, promptHeader: string): void {
    if (!this.ownerDocument) this.ownerDocument = this.containerEl.ownerDocument;
    if (!this.ownerWindow) this.ownerWindow = this.ownerDocument.defaultView;
    this.promptHeader = promptHeader; this.containerEl.empty(); this.containerEl.addClass("muse-zen-container");
    const wrapper = this.containerEl.createDiv({ cls: "muse-wrapper" });
    const done = wrapper.createEl("button", { cls: "muse-done-btn", attr: { "aria-label": "Exit zen mode", type: "button" } }); done.setText("Done"); this.registerDomEvent(done, "click", () => { void this.exitMuseMode(); });
    const promptEl = wrapper.createDiv({ cls: "muse-prompt" }); promptEl.createEl("blockquote", { text: prompt });
    const editor = wrapper.createDiv({ cls: "muse-editor" }); this.textareaEl = editor.createEl("textarea", { cls: "muse-textarea", attr: { placeholder: "Start writing...", "aria-label": "Writing area" } }); this.textareaEl.focus();
    if (this.saveInterval !== null) this.ownerWindow?.clearInterval(this.saveInterval);
    this.saveInterval = this.ownerWindow?.setInterval(() => { void this.saveContent(); }, 2000) ?? null;
    this.registerDomEvent(this.containerEl, "keydown", (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); void this.exitMuseMode(); } });
  }
  setFile(file: TFile): void { this.file = file; }
  private async saveContent(): Promise<void> {
    if (!this.file || !this.textareaEl) return;
    const value = this.textareaEl.value; if (value === this.lastSavedValue) return;
    try { await this.app.vault.process(this.file, () => this.promptHeader + value); this.lastSavedValue = value; }
    catch (error) { new Notice(`Could not save your writing. It will retry automatically. ${error instanceof Error ? error.message : ""}`); }
  }
  private cleanup(): void { if (this.saveInterval !== null) { this.ownerWindow?.clearInterval(this.saveInterval); this.saveInterval = null; } this.ownerDocument?.body.removeClass(ZEN_ACTIVE_CLASS); }
  private async exitMuseMode(): Promise<void> { try { await this.saveContent(); } finally { this.cleanup(); this.leaf.detach(); } }
  async onClose(): Promise<void> { try { await this.saveContent(); } finally { this.cleanup(); } }
}
