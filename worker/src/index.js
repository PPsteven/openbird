export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    if (path === "/api/v1/register" && method === "POST") return handleRegister(request, env)
    if (path === "/api/v1/publish" && method === "POST") return handlePublish(request, env)
    if (path === "/api/v1/documents" && method === "GET") return handleList(request, env)
    if (path === "/api/v1/documents" && method === "DELETE") return handleRemove(request, env)
    if (path === "/api/v1/upload-image" && method === "POST") return handleUploadImage(request, env)
    if (path === "/api/v1/account" && method === "PUT") return handleUpdateAccount(request, env)

    if (path.startsWith("/images/")) return serveImage(path, env)
    if (path.startsWith("/@")) return serveNamespacedPage(path, env)
    if (path.startsWith("/") && path.length > 1) return servePage(path.slice(1), env)

    return new Response("Not Found", { status: 404 })
  }
}

async function handleRegister(request, env) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return json({ error: "Email and password are required" }, 400)
    }

    const existing = await env.USERS.get("email:" + email)
    if (existing) {
      return json({ error: "Email already registered" }, 400)
    }

    const userId = "user_" + randomHex(12)
    const apiKey = "ob_" + randomHex(32)
    const passwordHash = await sha256(password)
    const keyHash = await sha256(apiKey)
    const now = new Date().toISOString()

    const user = {
      id: userId,
      email,
      passwordHash,
      keys: [{ prefix: apiKey.slice(0, 7), hash: keyHash, createdAt: now }],
      createdAt: now
    }

    await env.USERS.put("user:" + userId, JSON.stringify(user))
    await env.USERS.put("email:" + email, userId)
    await env.USERS.put("apikey:" + keyHash, JSON.stringify({ userId, createdAt: now }))

    return json({ userId, apiKey }, 201)
  } catch (e) {
    return json({ error: "Invalid request body" }, 400)
  }
}

async function verifyAuth(request, env) {
  const auth = request.headers.get("Authorization")
  if (!auth || !auth.startsWith("Bearer ob_")) return null

  const key = auth.slice(7)
  const keyHash = await sha256(key)
  const entry = await env.USERS.get("apikey:" + keyHash)
  if (!entry) return null

  const { userId } = JSON.parse(entry)
  const userData = await env.USERS.get("user:" + userId)
  if (!userData) return null

  return { userId, user: JSON.parse(userData) }
}

async function handlePublish(request, env) {
  const auth = await verifyAuth(request, env)
  if (!auth) return json({ error: "Invalid API key" }, 401)

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: "Invalid request body" }, 400)
  }

  const { markdown, title: titleParam, slug: slugParam, namespaced } = body

  if (!markdown || typeof markdown !== "string" || markdown.trim().length === 0) {
    return json({ error: "Missing markdown field" }, 400)
  }

  const markdownBytes = new TextEncoder().encode(markdown).length
  if (markdownBytes > 262144) {
    return json({ error: "Markdown too large (max 262144 bytes)" }, 413)
  }

  if (namespaced) {
    if (!slugParam) {
      return json({ error: "--namespace requires a slug" }, 400)
    }
    if (!auth.user.username) {
      return json({ error: "Username required for namespaced publishing" }, 403)
    }
    if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(slugParam)) {
      return json({ error: "Invalid slug format" }, 400)
    }

    const kvKey = `ns:${auth.user.username}/${slugParam}`
    const existing = await env.DOCS.get(kvKey)
    const isNew = !existing

    const title = titleParam || extractTitle(markdown) || "Untitled"
    const html = renderMarkdown(markdown)

    const htmlBytes = new TextEncoder().encode(html).length
    if (htmlBytes > 524288) {
      return json({ error: "Rendered HTML too large (max 524288 bytes)" }, 413)
    }

    const now = new Date().toISOString()
    const r2Key = `pages/@${auth.user.username}/${slugParam}/index.html`
    await env.PAGES.put(r2Key, html, {
      httpMetadata: { contentType: "text/html" },
      customMetadata: { userId: auth.userId, title, slug: slugParam, username: auth.user.username, createdAt: now, updatedAt: now }
    })

    const meta = { slug: slugParam, title, userId: auth.userId, username: auth.user.username, source: "api", createdAt: now, updatedAt: now }
    await env.DOCS.put(kvKey, JSON.stringify(meta))
    await env.DOCS.put(`user:${auth.userId}:docs:@${auth.user.username}/${slugParam}`, "1")

    const shareUrl = env.SHARE_URL || "https://share.jhao.space"
    return json({
      slug: slugParam,
      username: auth.user.username,
      url: `${shareUrl}/@${auth.user.username}/${slugParam}`,
      title,
      expiresAt: null,
      ttlDays: null,
      created: isNew
    }, isNew ? 201 : 200)
  }

  let slug
  let isNew = true

  if (slugParam) {
    if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(slugParam)) {
      return json({ error: "Invalid slug format" }, 400)
    }
    const existing = await env.DOCS.get("doc:" + slugParam)
    if (existing) {
      const doc = JSON.parse(existing)
      if (doc.userId !== auth.userId) {
        return json({ error: "Document not owned by user" }, 403)
      }
      isNew = false
    }
    slug = slugParam
  } else {
    slug = await allocateSlug(env)
    if (!slug) {
      return json({ error: "Failed to allocate document slug" }, 503)
    }
  }

  const title = titleParam || extractTitle(markdown) || "Untitled"
  const html = renderMarkdown(markdown)

  const htmlBytes = new TextEncoder().encode(html).length
  if (htmlBytes > 524288) {
    return json({ error: "Rendered HTML too large (max 524288 bytes)" }, 413)
  }

  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 90 * 86400000).toISOString()

  const htmlKey = `pages/${slug}/index.html`
  await env.PAGES.put(htmlKey, html, {
    httpMetadata: { contentType: "text/html" },
    customMetadata: { userId: auth.userId, title, slug, createdAt: now, updatedAt: now, expiresAt }
  })

  const meta = { slug, title, userId: auth.userId, source: "api", createdAt: now, updatedAt: now, expiresAt, ttlDays: 90 }
  await env.DOCS.put("doc:" + slug, JSON.stringify(meta), { expirationTtl: 90 * 86400 })
  await env.DOCS.put("user:" + auth.userId + ":docs:" + slug, "1", { expirationTtl: 90 * 86400 })

  const shareUrl = (env.SHARE_URL || "https://share.jhao.space") + "/" + slug

  return json({
    slug,
    username: null,
    url: shareUrl,
    title,
    expiresAt,
    ttlDays: 90,
    created: isNew
  }, isNew ? 201 : 200)
}

async function handleList(request, env) {
  const auth = await verifyAuth(request, env)
  if (!auth) return json({ error: "Invalid API key" }, 401)

  const prefix = "user:" + auth.userId + ":docs:"
  const result = await env.DOCS.list({ prefix })

  const docs = []
  for (const key of result.keys) {
    const suffix = key.name.slice(prefix.length)
    if (suffix.startsWith("@")) {
      const docData = await env.DOCS.get("ns:" + suffix.slice(1))
      if (!docData) continue
      const doc = JSON.parse(docData)
      const shareUrl = (env.SHARE_URL || "https://share.jhao.space") + "/@" + doc.username + "/" + doc.slug
      docs.push({
        slug: doc.slug,
        username: doc.username,
        title: doc.title,
        url: shareUrl,
        source: doc.source,
        updatedAt: doc.updatedAt,
        expiresAt: null
      })
    } else {
      const docData = await env.DOCS.get("doc:" + suffix)
      if (!docData) continue
      const doc = JSON.parse(docData)
      const shareUrl = (env.SHARE_URL || "https://share.jhao.space") + "/" + suffix
      docs.push({
        slug: doc.slug,
        username: null,
        title: doc.title,
        url: shareUrl,
        source: doc.source,
        updatedAt: doc.updatedAt,
        expiresAt: doc.expiresAt
      })
    }
  }

  docs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

  return json({ documents: docs })
}

async function handleRemove(request, env) {
  const auth = await verifyAuth(request, env)
  if (!auth) return json({ error: "Invalid API key" }, 401)

  const url = new URL(request.url)
  const slug = url.searchParams.get("slug")
  const namespaced = url.searchParams.get("namespaced") === "true"

  if (!slug) {
    return json({ error: "Missing slug parameter" }, 400)
  }

  if (namespaced) {
    if (!auth.user.username) {
      return json({ error: "Username required for namespaced operations" }, 403)
    }
    const kvKey = `ns:${auth.user.username}/${slug}`
    const docData = await env.DOCS.get(kvKey)
    if (!docData) {
      return json({ error: "Document not found" }, 404)
    }
    const doc = JSON.parse(docData)
    if (doc.userId !== auth.userId) {
      return json({ error: "Document not owned by user" }, 403)
    }
    await env.PAGES.delete(`pages/@${auth.user.username}/${slug}/index.html`)
    await env.DOCS.delete(kvKey)
    await env.DOCS.delete(`user:${auth.userId}:docs:@${auth.user.username}/${slug}`)
    return json({ ok: true })
  }

  const docData = await env.DOCS.get("doc:" + slug)
  if (!docData) {
    return json({ error: "Document not found" }, 404)
  }

  const doc = JSON.parse(docData)
  if (doc.userId !== auth.userId) {
    return json({ error: "Document not owned by user" }, 403)
  }

  await env.PAGES.delete("pages/" + slug + "/index.html")
  await env.DOCS.delete("doc:" + slug)
  await env.DOCS.delete("user:" + auth.userId + ":docs:" + slug)

  return json({ ok: true })
}

async function servePage(slug, env) {
  const obj = await env.PAGES.get("pages/" + slug + "/index.html")
  if (!obj) {
    return new Response("Not Found", { status: 404 })
  }

  return new Response(obj.body, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=3600"
    }
  })
}

async function handleUploadImage(request, env) {
  const auth = await verifyAuth(request, env)
  if (!auth) return json({ error: "Invalid API key" }, 401)

  let form, file
  try {
    form = await request.formData()
    file = form.get("file")
  } catch {
    return json({ error: "Invalid form data" }, 400)
  }

  if (!file || typeof file === "string") {
    return json({ error: "Missing file field" }, 400)
  }

  const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"])
  const EXT_MAP = { "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp", "image/svg+xml": ".svg" }

  const contentType = file.type
  if (!ALLOWED_TYPES.has(contentType)) {
    return json({ error: `Unsupported image type: ${contentType}` }, 400)
  }

  const buffer = await file.arrayBuffer()
  if (buffer.byteLength > 10 * 1024 * 1024) {
    return json({ error: "Image too large (max 10 MB)" }, 413)
  }

  const ext = EXT_MAP[contentType]
  const key = `images/${auth.userId}/${randomHex(16)}${ext}`
  await env.IMAGES.put(key, buffer, { httpMetadata: { contentType } })

  const shareUrl = env.SHARE_URL || "https://share.jhao.space"
  return json({ url: `${shareUrl}/${key}` }, 201)
}

async function serveImage(path, env) {
  const key = path.slice(1)
  const obj = await env.IMAGES.get(key)
  if (!obj) {
    return new Response("Not Found", { status: 404 })
  }

  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  })
}

async function serveNamespacedPage(path, env) {
  const match = path.match(/^\/@([^/]+)\/(.+)$/)
  if (!match) return new Response("Not Found", { status: 404 })
  const [, username, slug] = match
  const obj = await env.PAGES.get(`pages/@${username}/${slug}/index.html`)
  if (!obj) return new Response("Not Found", { status: 404 })
  return new Response(obj.body, {
    headers: { "Content-Type": "text/html", "Cache-Control": "public, max-age=3600" }
  })
}

async function handleUpdateAccount(request, env) {
  const auth = await verifyAuth(request, env)
  if (!auth) return json({ error: "Invalid API key" }, 401)

  let body
  try { body = await request.json() } catch { return json({ error: "Invalid request body" }, 400) }

  const { username } = body
  if (!username || typeof username !== "string") {
    return json({ error: "Username is required" }, 400)
  }
  if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(username)) {
    return json({ error: "Invalid username format" }, 400)
  }

  auth.user.username = username
  await env.USERS.put("user:" + auth.userId, JSON.stringify(auth.user))
  return json({ username })
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)/m)
  return match ? match[1].trim() : null
}

async function allocateSlug(env) {
  for (let i = 0; i < 5; i++) {
    const slug = generateSlug()
    const existing = await env.DOCS.get("doc:" + slug)
    if (!existing) return slug
  }
  return null
}

function renderMarkdown(markdown) {
  let result = markdown

  const codeBlocks = []
  result = result.replace(/```([\s\S]*?)```/g, (_, code) => {
    const placeholder = `%%CODEBLOCK_${codeBlocks.length}%%`
    codeBlocks.push(code)
    return placeholder
  })

  result = result.replace(/^\|(.+)\|(\r?\n\|.*\|)*/gm, (match) => {
    const lines = match.split("\n")
    const rows = lines.filter((l, i) => i !== 1 || !/^[\s\|:-]+$/.test(l))
    let html = "<table>\n"
    for (let i = 0; i < rows.length; i++) {
      const tag = i === 0 ? "th" : "td"
      const cells = rows[i].split("|").filter(c => c !== undefined).slice(1, -1)
      html += "<tr>" + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join("") + "</tr>\n"
    }
    html += "</table>"
    return html
  })

  result = result.replace(/^######\s+(.+)/gm, "<h6>$1</h6>")
  result = result.replace(/^#####\s+(.+)/gm, "<h5>$1</h5>")
  result = result.replace(/^####\s+(.+)/gm, "<h4>$1</h4>")
  result = result.replace(/^###\s+(.+)/gm, "<h3>$1</h3>")
  result = result.replace(/^##\s+(.+)/gm, "<h2>$1</h2>")
  result = result.replace(/^#\s+(.+)/gm, "<h1>$1</h1>")

  result = result.replace(/^---+\s*$/gm, "<hr>")

  result = result.replace(/^>\s+(.+)/gm, "<blockquote>$1</blockquote>")

  result = result.replace(/^(\s*)[-*]\s+(.+)/gm, (_, indent, content) => {
    return `<li>${content}</li>`
  })
  result = result.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")

  result = result.replace(/^\d+\.\s+(.+)/gm, (_, content) => {
    return `<li>${content}</li>`
  })
  result = result.replace(/(?:^<li>.*<\/li>\n?)+/gm, (match) => {
    if (!match.includes("<ol>")) {
      return `<ol>${match}</ol>`
    }
    return match
  })

  const paragraphs = result.split(/\n\n+/)
  result = paragraphs.map(p => {
    const trimmed = p.trim()
    if (!trimmed) return ""
    if (trimmed.startsWith("<")) return trimmed
    return `<p>${trimmed}</p>`
  }).join("\n")

  result = result.replace(/%%CODEBLOCK_(\d+)%%/g, (_, idx) => {
    const code = codeBlocks[parseInt(idx)]
    return `<pre><code>${escapeHtml(code.trim())}</code></pre>`
  })

  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>")
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>")
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  return wrapHtml(result)
}

function wrapHtml(content, title) {
  const t = title || "Untitled"
  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(t)} — OpenBird</title>
<style>
body{max-width:768px;margin:0 auto;padding:2rem 1.5rem;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.6;color:#1a1a1a}
h1,h2{border-bottom:1px solid #eee;padding-bottom:.3em}
code{background:#f4f4f4;padding:.2em .4em;border-radius:3px;font-size:.9em}
pre{background:#f4f4f4;padding:1em;border-radius:6px;overflow-x:auto}
pre code{background:none;padding:0}
blockquote{border-left:4px solid #ddd;margin:1em 0;padding:.5em 1em;color:#555}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ddd;padding:.5em .75em}
th{background:#f8f8f8}
img{max-width:100%;height:auto}
a{color:#0366d6}
</style>
</head>
<body>
<article>${content}</article>
</body>
</html>`
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  })
}

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("")
}

function randomHex(bytes) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map(b => b.toString(16).padStart(2, "0")).join("")
}

const ADJECTIVES = ["bright","calm","swift","red","blue","green","warm","cool","dark","light","sharp","soft","wild","bold","quick","slow","deep","high","low","wide","thin","long","short","clear","pure","dry","wet","raw","rare","kind","wise","fair","fine","rich","new","late","free","full","safe","sure","true","real","open","flat","pale","vast","keen","neat","warm","glad"]
const NOUNS = ["meadow","river","ocean","forest","mountain","valley","field","garden","lake","creek","hill","cliff","canyon","desert","island","shore","beach","cloud","storm","wind","rain","snow","frost","flame","stone","rock","pearl","coral","cedar","maple","pine","oak","wolf","fox","hawk","crane","swan","dove","fish","bear","deer","owl","moth","rose","lily","vine","fern","moss","leaf","seed"]

function generateSlug() {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)]
  let adj1 = pick(ADJECTIVES), adj2 = pick(ADJECTIVES)
  while (adj2 === adj1) adj2 = pick(ADJECTIVES)
  return `${adj1}-${adj2}-${pick(NOUNS)}`
}
