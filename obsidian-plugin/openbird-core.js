const DEFAULT_API_BASE = "https://openbird.jhao.space"
const USER_AGENT = "openbird-obsidian/0.1.0"
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

const IMAGE_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
}

function normalizeApiBase(value) {
  const trimmed = typeof value === "string" ? value.trim() : ""
  if (!trimmed) return DEFAULT_API_BASE
  return trimmed.replace(/\/+$/, "")
}

function buildPublishBody({ markdown, slug, namespaced, temp, title }) {
  const body = { markdown }
  if (slug) body.slug = slug
  if (namespaced) body.namespaced = true
  if (temp) body.temp = true
  if (title) body.title = title
  return body
}

function cleanImageRef(ref) {
  let cleaned = String(ref || "").trim()
  if (cleaned.startsWith("<") && cleaned.endsWith(">")) {
    cleaned = cleaned.slice(1, -1).trim()
  }
  try {
    return decodeURIComponent(cleaned)
  } catch {
    return cleaned
  }
}

function isRemoteRef(ref) {
  return /^(https?:|data:|mailto:|app:)/i.test(String(ref || "").trim())
}

function extractMarkdownImageRefs(markdown) {
  const refs = []
  const seen = new Set()
  const re = /!\[[^\]]*]\(([^)]+)\)/g
  let match
  while ((match = re.exec(markdown || "")) !== null) {
    const raw = match[1].trim()
    if (!raw || raw.startsWith("#") || isRemoteRef(raw)) continue
    const ref = cleanImageRef(raw)
    if (!seen.has(ref)) {
      seen.add(ref)
      refs.push(ref)
    }
  }
  return refs
}

function extractWikiImageRefs(markdown) {
  const refs = []
  const seen = new Set()
  const re = /!\[\[([^\]]+)]]/g
  let match
  while ((match = re.exec(markdown || "")) !== null) {
    const ref = cleanWikiRef(match[1])
    if (!ref || !isSupportedImagePath(ref) || seen.has(ref)) continue
    seen.add(ref)
    refs.push(ref)
  }
  return refs
}

function rewriteMarkdownImages(markdown, urlMap) {
  return String(markdown || "").replace(/!\[([^\]]*)]\(([^)]+)\)/g, (full, alt, raw) => {
    if (isRemoteRef(raw)) return full
    const url = urlMap.get(cleanImageRef(raw))
    if (!url) return full
    return `![${alt}](${url})`
  })
}

function rewriteWikiImageEmbeds(markdown, urlMap) {
  return String(markdown || "").replace(/!\[\[([^\]]+)]]/g, (full, raw) => {
    const ref = cleanWikiRef(raw)
    const url = urlMap.get(ref)
    if (!url) return full
    const name = ref.split("/").pop() || "image"
    return `![${name}](${url})`
  })
}

function cleanWikiRef(raw) {
  const withoutDisplay = String(raw || "").split("|")[0]
  const withoutHeading = withoutDisplay.split("#")[0]
  return cleanImageRef(withoutHeading)
}

function getSlugFromMappingValue(value) {
  const raw = String(value || "").trim()
  if (raw.startsWith("@") && raw.includes("/")) {
    return {
      slug: raw.slice(raw.indexOf("/") + 1),
      namespaced: true,
    }
  }
  return { slug: raw, namespaced: false }
}

function extname(path) {
  const match = String(path || "").toLowerCase().match(/(\.[a-z0-9]+)$/)
  return match ? match[1] : ""
}

function isSupportedImagePath(path) {
  return Boolean(IMAGE_TYPES[extname(path)])
}

function getImageContentType(path) {
  return IMAGE_TYPES[extname(path)] || null
}

module.exports = {
  DEFAULT_API_BASE,
  USER_AGENT,
  MAX_IMAGE_SIZE,
  normalizeApiBase,
  buildPublishBody,
  cleanImageRef,
  extractMarkdownImageRefs,
  extractWikiImageRefs,
  rewriteMarkdownImages,
  rewriteWikiImageEmbeds,
  getSlugFromMappingValue,
  isSupportedImagePath,
  getImageContentType,
}
