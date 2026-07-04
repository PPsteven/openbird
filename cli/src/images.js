import { readFileSync, existsSync, statSync } from "node:fs"
import { resolve, dirname, basename, extname } from "node:path"
import { getApiKey, API_BASE, USER_AGENT } from "./config.js"

const IMAGE_TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml" }
const MAX_SIZE = 10 * 1024 * 1024
const CONCURRENCY = 3

export function findLocalImages(markdown, docDir) {
  const images = [], seen = new Set()
  const re = /!\[[^\]]*\]\(([^)]+)\)/g
  let m
  while ((m = re.exec(markdown)) !== null) {
    const ref = m[1].trim()
    if (ref.startsWith("http://") || ref.startsWith("https://")) continue
    const abs = resolve(docDir, ref)
    if (!seen.has(abs)) { seen.add(abs); images.push({ ref, abs }) }
  }
  return images
}

async function uploadOne(buffer, fileName, contentType) {
  const apiKey = getApiKey()
  const form = new FormData()
  form.append("file", new Blob([buffer], { type: contentType }), fileName)
  const resp = await fetch(`${API_BASE}/api/v1/upload-image`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "User-Agent": USER_AGENT },
    body: form,
  })
  if (!resp.ok) { const t = await resp.text().catch(() => ""); throw new Error(t || "Upload failed") }
  const data = await resp.json()
  return data.url
}

export async function uploadAndRewriteImages(markdown, filePath) {
  const docDir = dirname(resolve(filePath))
  const images = findLocalImages(markdown, docDir)
  if (images.length === 0) return markdown

  const tasks = []
  for (const img of images) {
    const ext = extname(img.abs).toLowerCase()
    const ct = IMAGE_TYPES[ext]
    if (!ct) { console.error(`  ⚠ Skipping unsupported format: ${img.ref}`); continue }
    if (!existsSync(img.abs)) { console.error(`  ⚠ Not found: ${img.ref}`); continue }
    if (statSync(img.abs).size > MAX_SIZE) { console.error(`  ⚠ Over 10 MB: ${img.ref}`); continue }
    tasks.push({ img, buffer: readFileSync(img.abs), name: basename(img.abs), ct })
  }
  if (tasks.length === 0) return markdown

  const urlMap = new Map()
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(batch.map(t => uploadOne(t.buffer, t.name, t.ct)))
    for (let j = 0; j < results.length; j++) {
      if (results[j].status === "fulfilled") urlMap.set(batch[j].img.ref, results[j].value)
      else console.error(`  ⚠ Failed: ${batch[j].img.ref}: ${results[j].reason.message}`)
    }
  }

  let result = markdown
  for (const [localRef, remoteUrl] of urlMap) {
    const escaped = localRef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    result = result.replace(new RegExp(`(!\\[[^\\]]*\\]\\()${escaped}(\\))`, "g"), `$1${remoteUrl}$2`)
  }

  if (urlMap.size > 0) console.error(`  ${urlMap.size} image${urlMap.size > 1 ? "s" : ""} uploaded`)
  return result
}
