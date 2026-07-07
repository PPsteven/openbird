# OpenBird

Publish Markdown as shareable web pages with a single command.

An open-source alternative to [JotBird](https://jotbird.com), self-hosted on Cloudflare's free tier.

---

# Part 1: User Guide

## Features

- One command publishes Markdown to beautiful, permanent web pages
- Zero-config temporary publishing (`--temp`, no login, auto-expires in 1h)
- Local images auto-upload to cloud storage
- `username/slug` namespace for permanent URLs
- Completely free for personal/small team use (Cloudflare Free Tier)
- Zero npm dependencies

## Quick Start

### Prerequisites

- Node.js 18+

### 1. Install the CLI

```bash
git clone https://github.com/PPsteven/openbird.git
cd openbird/cli
npm link

# Verify installation
openbird --version
# → openbird v0.1.0
```

### 2. Login

```bash
openbird login
```

Your browser will open a login page. Enter your credentials to get an API key, which is saved automatically.

> **No account?** Use the demo account below, or deploy your own backend (see Part 2).

### 3. Publish Your First Document

```bash
echo "# Hello OpenBird" > hello.md
openbird publish hello.md
# → ✨ Published → https://openbird.jhao.space/quiet-blue-lake
```

Open the URL in your browser to see the rendered page.

> **Don't want to log in?** Use `--temp` for a 1-hour temporary page:
> ```bash
> echo "# Quick Test" > /tmp/test.md
> openbird publish --temp /tmp/test.md
> # → ⚡ Published (temp, 1h) → https://openbird.jhao.space/warm-clear-seed
> ```

## Demo Account

| Item | Value |
|------|-------|
| Username | `demo` |
| Password | `demo@123` |
| Backend URL | `https://openbird.jhao.space` |

Log in with the demo account to try all features. All documents are publicly visible — do not publish sensitive content.

## Command Reference

### openbird login

Authenticate the CLI. The token is saved to `~/.config/openbird/credentials`.

```bash
openbird login
```

You can also provide the API key via environment variable (for CI/CD):
```bash
export OPENBIRD_API_KEY="ob_xxx"
```

### openbird publish

Publish or update a Markdown document.

```bash
# Publish a file
openbird publish my-doc.md

# Custom URL slug
openbird publish --slug my-custom-url my-doc.md

# Publish to namespace (permanent URL, slug auto-allocated)
openbird publish --namespace my-doc.md

# Namespace + custom slug
openbird publish --slug my-page --namespace my-doc.md

# Temporary publish (no login, auto-expires in 1 hour)
openbird publish --temp my-doc.md

# Publish from stdin
cat my-doc.md | openbird publish

# Supported file formats: .md .markdown .mdx .txt .text
openbird publish notes.txt
```

| Flag | Description |
|------|-------------|
| `--slug <value>` | Custom URL slug (e.g. `my-page`, 3-60 chars, lowercase alphanumeric and hyphens) |
| `--namespace` | Publish to `username/<slug>` permanent URL, slug auto-allocated or specified with `--slug` |
| `--temp` | Temporary publish, no login required, auto-expires in 1 hour |

Output:

```
✨ Published → https://openbird.jhao.space/my-custom-url
```

Updating an existing document:

```
✓ Updated → https://openbird.jhao.space/my-custom-url
```

### openbird list

List all documents published by the current user.

```bash
openbird list
```

Output:

```
  my-custom-url  My Document Title
    https://openbird.jhao.space/my-custom-url
  ppsteven/my-page  My Page
    https://openbird.jhao.space/ppsteven/my-page
  2 documents
```

Namespace documents are shown as `username/slug`.

### openbird remove

Delete a published document.

```bash
# By filename (looks up from .openbird mapping)
openbird remove my-doc.md

# By slug directly
openbird remove my-custom-url

# Delete a namespaced document
openbird remove --namespace my-page

# Or pass username/slug directly
openbird remove ppsteven/my-page
```

Output:

```
✓ Removed my-custom-url
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENBIRD_API_URL` | Worker API URL | `https://openbird.jhao.space` (public instance) |
| `OPENBIRD_API_KEY` | API Key (takes precedence over credentials file) | None |

### Credentials File

The API key is stored in `~/.config/openbird/credentials` with permissions `0600`. Managed automatically by `openbird login`.

```bash
# Manual setup
mkdir -p ~/.config/openbird
echo "ob_your_api_key" > ~/.config/openbird/credentials
chmod 600 ~/.config/openbird/credentials
```

### Mapping File (.openbird)

When you publish a file, the CLI creates a `.openbird` file in the current directory to track filename-to-slug mappings:

```
# .openbird
my-doc.md = my-custom-url
about.md = ppsteven/my-page
```

Subsequent `openbird publish my-doc.md` calls will automatically update the same URL without needing `--slug`.

---

# Part 2: Self-Hosting

## Prerequisites

- Node.js 18+
- Cloudflare account ([free sign-up](https://dash.cloudflare.com/sign-up))
- [wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) 4.x+

```bash
npm install -g wrangler
wrangler login
```

## 1. Deploy the Backend

### Option 1: One-Click Script (Recommended)

```bash
git clone https://github.com/PPsteven/openbird.git
cd openbird/worker

# Configure environment variables
cp .env.example .env
# Edit .env, set your domain:
#   Custom domain:  OPENBIRD_DOMAIN=openbird.yourdomain.com
#   workers.dev:    OPENBIRD_DOMAIN=openbird.yoursubdomain.workers.dev

chmod +x deploy.sh
./deploy.sh
```

The script automatically creates KV namespaces, R2 buckets, generates `wrangler.toml`, and deploys.

### Option 2: Manual Deployment

```bash
git clone https://github.com/PPsteven/openbird.git
cd openbird/worker

# Create KV namespaces (note the output ids)
wrangler kv namespace create USERS
wrangler kv namespace create DOCS

# Create R2 buckets
wrangler r2 bucket create openbird-pages
wrangler r2 bucket create openbird-images

# Edit wrangler.toml, fill in the KV namespace ids above
# [[kv_namespaces]]
# binding = "USERS"
# id = "your-id"

# Deploy
wrangler deploy
# → Deployed "openbird" → https://openbird.your-subdomain.workers.dev
```

<details>
<summary>Optional: Bind a Custom Domain</summary>

After deployment, you can bind a custom domain:

1. Cloudflare Dashboard → Workers & Pages → openbird → Settings → Domains & Routes
2. Add a custom domain (e.g. `openbird.yourdomain.com`)
</details>

## 2. Point the CLI to Your Instance

```bash
export OPENBIRD_API_URL="https://openbird.your-subdomain.workers.dev"
```

## 3. Admin Account

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before deployment. The admin account is auto-created on the first request.

Admins can create additional users with `openbird register`:

```bash
openbird register --email user@example.com --password "password" [--username custom-name]
```

---

# Architecture

## Overview

```
CLI → api.js → Worker /api/v1/*
                   ↓
               KV (USERS + DOCS index)
               R2 (PAGES + IMAGES)
                   ↓
Browser → Worker /:slug → R2 → HTML response
```

A single Cloudflare Worker handles everything: API, page serving, and image proxy.

## Data Storage

| Storage | Purpose | Free Tier |
|---------|---------|-----------|
| KV `USERS` | User accounts, API key hashes, email index | 1 GB |
| KV `DOCS` | Document metadata (slug, title, expiry) | 1 GB |
| R2 `PAGES` | Rendered HTML pages | 10 GB |
| R2 `IMAGES` | User-uploaded images | 10 GB |

## Markdown Rendering

The Worker has a built-in zero-dependency Markdown renderer supporting:

- Headings (h1-h6)
- Bold, italic, inline code
- Links, images
- Unordered and ordered lists
- Blockquotes, horizontal rules
- Tables
- Fenced code blocks

Pages are returned as complete HTML documents with inline CSS, viewable directly in any browser.

---

# API Documentation

All API endpoints require `Authorization: Bearer ob_xxx` header (except guest publish).

## POST /api/v1/register

Admin only. Creates a new user account. Requires the admin's API key.

```bash
curl -X POST https://openbird.jhao.space/api/v1/register \
  -H "Authorization: Bearer ob_admin_api_key" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"your-password","username":"optional-username"}'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | yes | User email address |
| `password` | string | no | Auto-generated random password if omitted |
| `username` | string | no | Custom username, defaults to email local-part if omitted |

Response (201):
```json
{
  "userId": "user_a1b2c3d4e5f6",
  "apiKey": "ob_xxx...",
  "email": "user@example.com",
  "username": "optional-username"
}
```

Non-admin callers receive:
```json
{
  "error": "Registration is closed"
}
```

## POST /api/v1/publish

Publish or update a document.

```bash
curl -X POST https://openbird.jhao.space/api/v1/publish \
  -H "Authorization: Bearer ob_xxx" \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Hello\n\nWorld","slug":"my-page"}'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `markdown` | string | yes | Markdown content (max 256KB) |
| `slug` | string | no | Custom URL slug, auto-generated if omitted |
| `namespaced` | boolean | no | Set to `true` to publish to `username/slug` (requires username) |
| `title` | string | no | Page title, extracted from first `# Title` if omitted |

Response (201 created / 200 updated):
```json
{
  "slug": "my-page",
  "username": null,
  "url": "https://openbird.jhao.space/my-page",
  "title": "Hello",
  "created": true
}
```

## POST /api/v1/publish (Guest)

No authentication required. Publishes a 1-hour temporary page. Must pass `temp: true`.

```bash
curl -X POST https://openbird.jhao.space/api/v1/publish \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Hello Guest","temp":true}'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `markdown` | string | yes | Markdown content (max 256KB) |
| `temp` | boolean | yes | Must be `true`, otherwise returns 401 |
| `slug` | string | no | Custom slug, auto-generated if omitted |
| `title` | string | no | Page title |

Response (201):
```json
{
  "slug": "warm-clear-seed",
  "url": "https://openbird.jhao.space/warm-clear-seed",
  "title": "Hello Guest",
  "expiresAt": "2026-07-04T11:00:00.000Z",
  "ttlMinutes": 60,
  "guest": true
}
```

## GET /api/v1/documents

List all documents for the current user.

```bash
curl https://openbird.jhao.space/api/v1/documents \
  -H "Authorization: Bearer ob_xxx"
```

Response (200):
```json
{
  "documents": [
    {
      "slug": "my-page",
      "username": null,
      "title": "Hello",
      "url": "https://openbird.jhao.space/my-page",
      "source": "api",
      "updatedAt": "2026-07-04T10:00:00.000Z",
      "expiresAt": null
    }
  ]
}
```

Results are sorted by `updatedAt` descending. Namespace documents have a non-null `username` field.

## DELETE /api/v1/documents

Delete a document.

```bash
# Delete a regular document
curl -X DELETE "https://openbird.jhao.space/api/v1/documents?slug=my-page" \
  -H "Authorization: Bearer ob_xxx"

# Delete a namespaced document
curl -X DELETE "https://openbird.jhao.space/api/v1/documents?slug=my-page&namespaced=true" \
  -H "Authorization: Bearer ob_xxx"
```

Response (200):
```json
{ "ok": true }
```

## POST /api/v1/upload-image

Upload an image.

```bash
curl -X POST https://openbird.jhao.space/api/v1/upload-image \
  -H "Authorization: Bearer ob_xxx" \
  -F "file=@photo.png"
```

Supported formats: png, jpeg, gif, webp, svg. Max 10 MB.

Response (200):
```json
{
  "url": "https://openbird.jhao.space/images/user_abc123/a1b2c3d4.png"
}
```

## GET /:slug

View a published page.

```bash
curl https://openbird.jhao.space/my-page
# → HTML document
```

## GET /:username/:slug

View a namespaced page.

```bash
curl https://openbird.jhao.space/ppsteven/my-page
# → HTML document
```

---

# Development

## Local Development

```bash
# Start local Worker (with KV + R2 simulation)
cd worker
wrangler dev
# → Ready on http://localhost:8787

# In another terminal, test
curl -X POST http://localhost:8787/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

Point the CLI to your local Worker:

```bash
cd cli
export OPENBIRD_API_URL="http://localhost:8787"
node src/cli.js publish test.md
```

## Project Structure

```
pagebird/
├── AGENTS.md                 # AI Agent rules & conventions
├── README.md                 # Project documentation (English)
├── README.zh.md              # Project documentation (Chinese)
├── docs/                     # Design documents
│   ├── D0-reference.md       # JotBird reverse engineering reference
│   ├── D1-worker-core.md     # Worker backend spec
│   ├── D2-cli-core.md        # CLI core spec
│   ├── D3-images.md          # Image upload spec
│   ├── D4-namespace.md       # Namespace spec
│   ├── D5-deployment.md      # Deployment verification spec
│   ├── D6-documentation.md   # Documentation spec
│   ├── architecture.md       # Architecture & decisions
│   ├── status.md             # Progress tracking
│   └── troubleshoot.md       # Troubleshooting guide
├── worker/                   # Cloudflare Worker
│   ├── src/index.js          # Worker main program
│   ├── wrangler.toml         # Worker configuration
│   └── package.json
└── cli/                      # CLI tool
    ├── src/
    │   ├── cli.js            # CLI entry point
    │   ├── api.js            # API client
    │   ├── config.js         # Configuration management
    │   ├── files.js          # File type validation
    │   ├── images.js         # Image upload & rewriting
    │   ├── login.js          # Login flow
    │   └── mapping.js        # .openbird mapping management
    └── package.json
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| CLI | Node.js 18+ ESM, zero dependencies |
| Worker | Cloudflare Workers (V8 isolate) |
| Page Storage | Cloudflare R2 |
| Index Storage | Cloudflare KV |
| Image Storage | Cloudflare R2 |
| Deployment | wrangler CLI |

---

# License

MIT
