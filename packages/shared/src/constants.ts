// Default server URL
export const DEFAULT_SERVER = "https://api.hustlebots.org";

// Local config directory
export const CONFIG_DIR = ".hustlebots";
export const CONFIG_FILE = "config.json";
export const KEYS_FILE = "keys.json";
export const WALLET_FILE = "wallet.json";
export const CONTACTS_FILE = "contacts.json";

// Contract defaults
export const DEFAULT_NOTICE_DAYS = 7;
export const DEFAULT_PAY_INTERVAL = "weekly" as const;

// Payroll
export const PAYROLL_DAY = 0; // Sunday (0 = Sun, 1 = Mon, ...)

// NIP-98 auth
export const AUTH_HEADER = "Authorization";
export const AUTH_TIMESTAMP_TOLERANCE_SECONDS = 60;
