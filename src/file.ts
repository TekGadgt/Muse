import { normalizePath, TFile, TFolder, Vault } from "obsidian";

function todayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function ensureFolder(vault: Vault, folderPath: string): Promise<void> {
  const normalized = normalizePath(folderPath);
  const existing = vault.getAbstractFileByPath(normalized);
  if (existing instanceof TFolder) return;
  await vault.createFolder(normalized);
}

function findAvailablePath(vault: Vault, folder: string, date: string): string {
  const basePath = normalizePath(`${folder}/${date}.md`);
  const existing = vault.getAbstractFileByPath(basePath);
  if (!existing) return basePath;

  let counter = 2;
  while (true) {
    const candidate = normalizePath(`${folder}/${date}-${counter}.md`);
    if (!vault.getAbstractFileByPath(candidate)) return candidate;
    counter++;
  }
}

export async function createZenNote(
  vault: Vault,
  outputFolder: string,
  prompt: string
): Promise<TFile> {
  await ensureFolder(vault, outputFolder);
  const date = todayString();
  const filePath = findAvailablePath(vault, outputFolder, date);
  const blockquoted = prompt.split("\n").map(line => `> ${line}`).join("\n");
  const content = `${blockquoted}\n\n`;
  return await vault.create(filePath, content);
}
