import { afterEach, describe, expect, it, vi } from "vitest";
import MusePlugin from "../src/main";
import { Notice, TFile, TFolder } from "obsidian";
import { createZenNote } from "../src/file";
import { ZenWriterView } from "../src/view";
import { MuseSettingTab } from "../src/settings";
import { Setting } from "obsidian";

const pluginFor = (saveData: (snapshot: unknown) => Promise<void>) => {
  const plugin = Object.create(MusePlugin.prototype) as MusePlugin & { saveQueue: Promise<void> };
  (plugin as any).settings = { provider: "anthropic", value: "initial" };
  (plugin as any).saveData = saveData;
  (plugin as any).saveQueue = Promise.resolve();
  return plugin;
};

describe("MusePlugin runtime behavior", () => {
  it("surfaces a rejected save and recovers for an ordered subsequent snapshot", async () => {
    const snapshots: unknown[] = [];
    let rejectFirst = true;
    const plugin = pluginFor(async (snapshot) => { snapshots.push(snapshot); if (rejectFirst) { rejectFirst = false; throw new Error("disk"); } });
    const first = plugin.saveSettings();
    (plugin as any).settings.value = "second";
    const second = plugin.saveSettings();
    await expect(first).rejects.toThrow("disk");
    await expect(second).resolves.toBeUndefined();
    expect(snapshots).toEqual([{ provider: "anthropic", value: "initial" }, { provider: "anthropic", value: "second" }]);
  });

  it("collects newest ten prompts in descending mtime while isolating unreadable notes", async () => {
    const folder = new TFolder("Muse");
    const files = Array.from({ length: 12 }, (_, index) => new TFile(`Muse/${index}.md`, { mtime: index }, `> prompt-${index}\nbody`));
    folder.children = [...files, new TFile("Muse/bad.md", { mtime: 99 })];
    const vault = { getAbstractFileByPath: () => folder, read: vi.fn(async (file: TFile) => { if (file.path.endsWith("bad.md")) throw new Error("unreadable"); return file.content; }) };
    const plugin = Object.create(MusePlugin.prototype) as any;
    plugin.settings = { outputFolder: "Muse" };
    plugin.app = { vault };
    await expect(plugin.getPastPrompts()).resolves.toEqual(["prompt-11", "prompt-10", "prompt-9", "prompt-8", "prompt-7", "prompt-6", "prompt-5", "prompt-4", "prompt-3"]);
    expect(vault.read).toHaveBeenCalledTimes(10);
  });
});

describe("ZenWriterView runtime behavior", () => {
  afterEach(() => vi.restoreAllMocks());
  it("keeps dirty content retryable after process failure and cleans the owning window/document", async () => {
    (Notice as any).messages.length = 0;
    const body = { addClass: vi.fn(), removeClass: vi.fn() };
    const ownerDocument = { body, defaultView: null as any };
    const ownerWindow = { setInterval: vi.fn(() => 42), clearInterval: vi.fn() };
    ownerDocument.defaultView = ownerWindow;
    const container = { ownerDocument };
    const process = vi.fn().mockRejectedValueOnce(new Error("disk")).mockResolvedValueOnce(undefined);
    const view = new ZenWriterView({ app: { vault: { process } }, containerEl: container, detach: vi.fn() } as any) as any;
    view.file = new TFile("Muse/note.md");
    view.textareaEl = { value: "draft" };
    view.promptHeader = "> prompt\n\n";
    view.ownerDocument = ownerDocument;
    view.ownerWindow = ownerWindow;
    view.saveInterval = 42;
    await view.saveContent();
    expect(view.lastSavedValue).toBe("");
    expect((Notice as any).messages[0]).toMatch(/Could not save your writing/);
    await view.saveContent();
    expect(view.lastSavedValue).toBe("draft");
    await view.onClose();
    expect(ownerWindow.clearInterval).toHaveBeenCalledWith(42);
    expect(body.removeClass).toHaveBeenCalledWith("muse-zen-active");
    expect(process).toHaveBeenCalledTimes(2);
  });

  it("uses the container owner window when rendering and captures it for cleanup", async () => {
    const body = { addClass: vi.fn(), removeClass: vi.fn() };
    const ownerDocument = { body, defaultView: { setInterval: vi.fn(() => 7), clearInterval: vi.fn() } };
    const node = (): any => ({ createSpan: vi.fn(), setAttribute: vi.fn(), setText: vi.fn(), focus: vi.fn(), value: "", createEl: vi.fn(() => node()), createDiv: vi.fn(() => node()) });
    const container: any = { ownerDocument, addClass: vi.fn(), empty: vi.fn(), createDiv: vi.fn(node) };
    const view = new ZenWriterView({ app: { vault: {} }, containerEl: container } as any) as any;
    await view.onOpen();
    view.renderWritingSurface("prompt", "header");
    expect(ownerDocument.defaultView.setInterval).toHaveBeenCalled();
    view.cleanup();
    expect(ownerDocument.defaultView.clearInterval).toHaveBeenCalledWith(7);
  });
});

describe("createZenNote output paths", () => {
  const makeVault = (existing: Record<string, any> = {}) => {
    const created: any[] = [];
    return {
      created,
      getAbstractFileByPath: (path: string) => existing[path] ?? created.find((item) => item.path === path),
      createFolder: async (path: string) => { existing[path] = new TFolder(path); },
      create: async (path: string, content: string) => { const file = new TFile(path); file.content = content; created.push(file); return file; },
    };
  };
  it.each(["", ".", "../Muse", "Muse/../Other", "Muse/./sub"])("rejects unsafe folder %s", async (path) => { await expect(createZenNote(makeVault() as any, path, "prompt")).rejects.toThrow(); });
  it("rejects a file target and suffixes date collisions while writing expected content", async () => {
    const date = new Date();
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const vault = makeVault({ Muse: new TFolder("Muse"), [`Muse/${day}.md`]: new TFile(`Muse/${day}.md`), [`Muse/${day}-2.md`]: new TFile(`Muse/${day}-2.md`) });
    const file = await createZenNote(vault as any, "Muse", "line one\nline two");
    expect(file.path).toBe(`Muse/${day}-3.md`);
    expect(file.content).toBe("> line one\n> line two\n\n");
    await expect(createZenNote(makeVault({ Muse: new TFile("Muse") }) as any, "Muse", "p")).rejects.toThrow(/file, not a folder/);
  });
});

describe("settings controls", () => {
  it("uses textareas only for Bio and Additional context", () => {
    (Setting as any).instances.length = 0;
    const tab = new MuseSettingTab({} as any, { settings: { provider: "anthropic", modelOverride: "", name: "", websiteUrl: "", githubUsername: "", bio: "", topics: "", additionalContext: "", outputFolder: "", anthropicApiKeySecretId: "", openAIApiKeySecretId: "", pendingLegacySecretId: "" }, saveSettings: vi.fn() } as any);
    (tab as any).containerEl = { empty: vi.fn() };
    tab.display();
    const instances = (Setting as any).instances as Array<{ controls: string[] }>;
    const areas = instances.filter((setting) => setting.controls.includes("textarea"));
    expect(areas).toHaveLength(2);
    expect(instances.filter((setting) => setting.controls.includes("text"))).toHaveLength(6);
  });
});
