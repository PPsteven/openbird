import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const MAPPING_FILE = ".openbird"

function getMappingPath() { return join(process.cwd(), MAPPING_FILE) }

export function readMappings() {
  const path = getMappingPath()
  const map = new Map()
  if (!existsSync(path)) return map
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const file = trimmed.slice(0, eq).trim()
    const slug = trimmed.slice(eq + 1).trim()
    if (file && slug) map.set(file, slug)
  }
  return map
}

export function writeMappings(map) {
  const lines = []
  for (const [file, slug] of map) lines.push(`${file} = ${slug}`)
  writeFileSync(getMappingPath(), lines.join("\n") + "\n")
}

export function setMapping(filename, slug) {
  const map = readMappings()
  map.set(filename, slug)
  writeMappings(map)
}

export function removeMapping(target) {
  const map = readMappings()
  if (map.has(target)) { map.delete(target); writeMappings(map); return true }
  for (const [file, slug] of map) {
    if (slug === target) { map.delete(file); writeMappings(map); return true }
  }
  return false
}
