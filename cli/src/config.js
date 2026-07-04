import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const CONFIG_DIR = join(homedir(), ".config", "openbird")
const CREDENTIALS_FILE = join(CONFIG_DIR, "credentials")

export const API_BASE = process.env.OPENBIRD_API_URL || "https://openbird.jhao.space"
export const VERSION = "0.1.0"
export const USER_AGENT = `openbird-cli/${VERSION}`

export function getApiKey() {
  if (process.env.OPENBIRD_API_KEY) return process.env.OPENBIRD_API_KEY
  try { return readFileSync(CREDENTIALS_FILE, "utf-8").trim() }
  catch { return null }
}

export function saveApiKey(key) {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CREDENTIALS_FILE, key + "\n", { mode: 0o600 })
}

export function getCredentialsPath() { return CREDENTIALS_FILE }
