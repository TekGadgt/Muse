export class TFile {
  extension = "md";
  constructor(public path: string, public stat: { mtime: number } = { mtime: 0 }, public content = "") {}
}
export class TFolder {
  children: Array<TFile | TFolder> = [];
  constructor(public path: string) {}
}
export class Vault {}
export class App {}
export class Plugin {
  app: any;
  constructor(app: any = {}) { this.app = app; }
  registerView() {}
  addCommand() {}
  addRibbonIcon() {}
  addSettingTab() {}
  async loadData() { return {}; }
  async saveData(_data: unknown) {}
}
export class WorkspaceLeaf { view: any; detach = () => {}; }
export class ItemView {
  app: any;
  containerEl: any;
  leaf: any;
  constructor(leaf: any) { this.leaf = leaf; this.app = leaf.app; this.containerEl = leaf.containerEl; }
  registerDomEvent() {}
}
export class PluginSettingTab { containerEl: any; app: any; constructor(app: any) { this.app = app; } }
export class SecretComponent {
  constructor(..._args: any[]) {}
  setValue() { return this; }
  onChange() { return this; }
}
export class Setting {
  static instances: Setting[] = [];
  controls: string[] = [];
  constructor(public containerEl: any) { Setting.instances.push(this); }
  setName() { return this; }
  setDesc() { return this; }
  setHeading() { return this; }
  addDropdown() { return this; }
  addComponent() { return this; }
  addButton() { return this; }
  addText(callback: (component: any) => void) { this.controls.push("text"); callback({ setValue: () => ({ onChange: () => {} }) }); return this; }
  addTextArea(callback: (component: any) => void) { this.controls.push("textarea"); callback({ setValue: () => ({ onChange: () => {} }) }); return this; }
}
export class Notice { static messages: string[] = []; constructor(public message: string) { Notice.messages.push(message); } }
export function normalizePath(path: string): string { return path.replace(/^\/|\/$/g, ""); }
export function requestUrl(..._args: unknown[]): Promise<unknown> { return Promise.reject(new Error("requestUrl must be mocked")); }
