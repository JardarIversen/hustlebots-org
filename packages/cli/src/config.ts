import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  CONFIG_DIR,
  CONFIG_FILE,
  KEYS_FILE,
  WALLET_FILE,
  CONTACTS_FILE,
  DEFAULT_SERVER,
} from "@hustlebots/shared";
import type {
  LocalConfig,
  LocalKeys,
  LocalWallet,
  LocalContact,
} from "@hustlebots/shared";

// ─── Paths ───────────────────────────────────────────────────────────────────

function getConfigDir(): string {
  return path.join(os.homedir(), CONFIG_DIR);
}

function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJsonFile<T>(filename: string): T | null {
  const filePath = path.join(getConfigDir(), filename);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content) as T;
}

function writeJsonFile<T>(filename: string, data: T): void {
  ensureConfigDir();
  const filePath = path.join(getConfigDir(), filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Config ──────────────────────────────────────────────────────────────────

export function getConfig(): LocalConfig {
  const config = readJsonFile<LocalConfig>(CONFIG_FILE);
  return config ?? { server: DEFAULT_SERVER, defaultOrg: null };
}

export function saveConfig(config: LocalConfig): void {
  writeJsonFile(CONFIG_FILE, config);
}

export function getServerUrl(): string {
  return process.env.HUSTLEBOTS_SERVER || getConfig().server;
}

export function getDefaultOrg(): string | null {
  return getConfig().defaultOrg;
}

export function setDefaultOrg(orgId: string): void {
  const config = getConfig();
  config.defaultOrg = orgId;
  saveConfig(config);
}

// ─── Keys ────────────────────────────────────────────────────────────────────

export function getKeys(): LocalKeys | null {
  return readJsonFile<LocalKeys>(KEYS_FILE);
}

export function saveKeys(keys: LocalKeys): void {
  writeJsonFile(KEYS_FILE, keys);
}

export function requireKeys(): LocalKeys {
  const keys = getKeys();
  if (!keys) {
    console.error(
      "No identity found. Run 'hustlebots register' first."
    );
    process.exit(1);
  }
  return keys;
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

export function getWallet(): LocalWallet | null {
  return readJsonFile<LocalWallet>(WALLET_FILE);
}

export function saveWallet(wallet: LocalWallet): void {
  writeJsonFile(WALLET_FILE, wallet);
}

// ─── Contacts ────────────────────────────────────────────────────────────────

interface ContactsFile {
  contacts: LocalContact[];
}

export function getContacts(): LocalContact[] {
  const data = readJsonFile<ContactsFile>(CONTACTS_FILE);
  return data?.contacts ?? [];
}

export function saveContacts(contacts: LocalContact[]): void {
  writeJsonFile(CONTACTS_FILE, { contacts });
}

export function addContact(name: string, npub: string): void {
  const contacts = getContacts();
  const existing = contacts.findIndex((c) => c.name === name);
  if (existing >= 0) {
    contacts[existing] = { name, npub };
  } else {
    contacts.push({ name, npub });
  }
  saveContacts(contacts);
}

export function removeContact(name: string): boolean {
  const contacts = getContacts();
  const filtered = contacts.filter((c) => c.name !== name);
  if (filtered.length === contacts.length) return false;
  saveContacts(filtered);
  return true;
}

/**
 * Resolve a contact name (like @researcher) to an npub.
 * If the input is already an npub, return it as-is.
 */
export function resolveContact(nameOrNpub: string): string {
  if (nameOrNpub.startsWith("npub1")) return nameOrNpub;

  const name = nameOrNpub.startsWith("@")
    ? nameOrNpub.slice(1)
    : nameOrNpub;

  const contacts = getContacts();
  const contact = contacts.find((c) => c.name === name);

  if (!contact) {
    console.error(
      `Contact '@${name}' not found. Add with: hustlebots contact add @${name} <npub>`
    );
    process.exit(1);
  }

  return contact.npub;
}
