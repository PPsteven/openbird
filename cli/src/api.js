import { getApiKey, API_BASE, USER_AGENT } from "./config.js"

async function apiRequest(method, path, body) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error("Not logged in. Run `openbird login` first.")

  const opts = {
    method,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "User-Agent": USER_AGENT,
    },
  }

  if (body) {
    opts.headers["Content-Type"] = "application/json"
    opts.body = JSON.stringify(body)
  }

  const resp = await fetch(`${API_BASE}${path}`, opts)
  const data = await resp.json().catch(() => null)
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`)
  return data
}

export async function publish({ markdown, slug, namespaced }) {
  const body = { markdown }
  if (slug) body.slug = slug
  if (namespaced) body.namespaced = true
  return apiRequest("POST", "/api/v1/publish", body)
}

export async function listDocuments() {
  return apiRequest("GET", "/api/v1/documents")
}

export async function anonymousPublish({ markdown, slug }) {
  const body = { markdown, temp: true }
  if (slug) body.slug = slug

  const resp = await fetch(`${API_BASE}/api/v1/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify(body),
  })
  const data = await resp.json().catch(() => null)
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`)
  return data
}

export async function registerUser({ email, password, username }) {
  const body = { email }
  if (password) body.password = password
  if (username) body.username = username
  return apiRequest("POST", "/api/v1/register", body)
}

export async function removeDocument(slug, { namespaced = false } = {}) {
  let url = `/api/v1/documents?slug=${encodeURIComponent(slug)}`
  if (namespaced) url += "&namespaced=true"

  const apiKey = getApiKey()
  if (!apiKey) throw new Error("Not logged in. Run `openbird login` first.")

  const resp = await fetch(`${API_BASE}${url}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${apiKey}`, "User-Agent": USER_AGENT },
  })
  const data = await resp.json().catch(() => null)
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`)
  return data
}
