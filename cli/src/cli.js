#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs"
import { basename } from "node:path"
import { createInterface } from "node:readline"
import { getApiKey, saveApiKey, getCredentialsPath, API_BASE, VERSION } from "./config.js"
import { publish, listDocuments, removeDocument, anonymousPublish, registerUser } from "./api.js"
import { readMappings, setMapping, removeMapping, writeMappings } from "./mapping.js"
import { startCallbackServer, openBrowser } from "./login.js"
import { isAllowedFile, ALLOWED_EXTENSIONS } from "./files.js"
import { uploadAndRewriteImages } from "./images.js"

const args = process.argv.slice(2)
const command = args[0]

async function main() {
  switch (command) {
    case "login": return cmdLogin()
    case "register": return cmdRegister(args.slice(1))
    case "publish": return cmdPublish(args.slice(1))
    case "remove": return cmdRemove(args.slice(1))
    case "list": return cmdList()
    case "help": case "--help": case "-h": return cmdHelp()
    case "version": case "--version": case "-v": return console.log(`openbird ${VERSION}`)
    default:
      if (!command) { cmdHelp(); process.exit(1) }
      console.error(`Unknown command: ${command}\nRun "openbird help" for usage.`)
      process.exit(1)
  }
}

async function cmdLogin() {
  const existing = getApiKey()
  if (existing) {
    const answer = await askQuestion("Replace existing token? [y/N] ")
    if (answer.toLowerCase() !== "y") {
      console.log("Login cancelled.")
      process.exit(0)
    }
  }

  let server
  try {
    server = await startCallbackServer()
  } catch {
    server = null
  }

  if (server) {
    const loginUrl = `${API_BASE}/api/v1/login?callback=http://127.0.0.1:${server.port}/callback`
    console.log(`Opening browser for login...\n${loginUrl}`)
    openBrowser(loginUrl)
  } else {
    console.log("Could not start local callback server. Manual login required.")
  }

  console.log("Or paste your API token here and press Enter:")

  try {
    let token
    if (server) {
      token = await Promise.race([
        server.tokenPromise,
        manualInput(),
      ])
      server.close()
    } else {
      token = await manualInput()
    }

    if (!token || !token.startsWith("ob_")) {
      console.error("Invalid token format. Token should start with ob_")
      process.exit(1)
    }

    saveApiKey(token)
    console.log("✓ Logged in!")
  } catch (e) {
    if (e.message === "timeout") {
      console.error("Login timed out. Please try again.")
    } else {
      console.error(`Login failed: ${e.message}`)
    }
    process.exit(1)
  }
}

function manualInput() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question("", answer => { rl.close(); resolve(answer.trim()) })
  })
}

function askQuestion(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer.trim()) })
  })
}

async function cmdRegister(registerArgs) {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.error("✗ Not logged in. Run `openbird login` first.")
    process.exit(1)
  }

  let email = null, password = null, username = null
  for (let i = 0; i < registerArgs.length; i++) {
    if (registerArgs[i] === "--email" && i + 1 < registerArgs.length) email = registerArgs[++i]
    else if (registerArgs[i] === "--password" && i + 1 < registerArgs.length) password = registerArgs[++i]
    else if (registerArgs[i] === "--username" && i + 1 < registerArgs.length) username = registerArgs[++i]
  }

  if (!email) {
    console.error("✗ --email is required")
    process.exit(1)
  }

  try {
    const result = await registerUser({ email, password, username })
    console.log(`✓ User registered: ${result.email}`)
    console.log(`  API Key: ${result.apiKey}`)
  } catch (e) {
    console.error(`✗ Register failed: ${e.message}`)
    process.exit(1)
  }
}

function parsePublishArgs(fileArgs) {
  let slug = null, namespaced = false, temp = false
  const files = []
  for (let i = 0; i < fileArgs.length; i++) {
    if (fileArgs[i] === "--slug" && i + 1 < fileArgs.length) { slug = fileArgs[++i] }
    else if (fileArgs[i] === "--namespace") { namespaced = true }
    else if (fileArgs[i] === "--temp") { temp = true }
    else files.push(fileArgs[i])
  }
  return { slug, namespaced, temp, files }
}

function parseSlugValue(value) {
  if (value.includes("/")) {
    const slash = value.indexOf("/")
    return { slug: value.slice(slash + 1), namespaced: true }
  }
  return { slug: value, namespaced: false }
}

async function cmdPublish(publishArgs) {
  const { slug: explicitSlug, namespaced, temp, files: positional } = parsePublishArgs(publishArgs)

  const apiKey = getApiKey()
  if (!apiKey && !temp) {
    console.error("✗ Not logged in. Run `openbird login` first, or use `--temp`.")
    process.exit(1)
  }

  let filename = null
  let markdown

  if (positional.length === 0 || positional[0] === "-") {
    markdown = await readStdin()
    if (!markdown) {
      console.error("✗ No input received from stdin.")
      process.exit(1)
    }
  } else {
    const filePath = positional[0]
    if (!existsSync(filePath)) {
      console.error(`✗ Cannot read file: ${filePath}`)
      process.exit(1)
    }
    if (!isAllowedFile(basename(filePath))) {
      const exts = [...ALLOWED_EXTENSIONS].join(", ")
      console.error(`✗ Unsupported file type. Allowed extensions: ${exts}`)
      process.exit(1)
    }
    markdown = readFileSync(filePath, "utf-8")
    filename = filePath
    if (!temp) {
      markdown = await uploadAndRewriteImages(markdown, filename)
    }
  }

  let slug = explicitSlug
  let isNamespaced = namespaced
  if (!slug && filename) {
    const mappings = readMappings()
    const raw = mappings.get(filename) || mappings.get(basename(filename)) || null
    if (raw) {
      const parsed = parseSlugValue(raw)
      slug = parsed.slug
      isNamespaced = parsed.namespaced
    }
  }

  if (temp) {
    try {
      const result = await anonymousPublish({ markdown, slug: explicitSlug })
      console.log(`⚡ Published (temp, 1h) → ${result.url}`)
    } catch (e) {
      console.error(`✗ Publish failed: ${e.message}`)
      process.exit(1)
    }
    return
  }

  try {
    const result = await publish({ markdown, slug, namespaced: isNamespaced })
    if (filename) {
      const mappingValue = result.username ? `${result.username}/${result.slug}` : result.slug
      setMapping(filename, mappingValue)
    }
    if (result.created) {
      console.log(`✨ Published → ${result.url}`)
    } else {
      console.log(`✓ Updated → ${result.url}`)
    }
  } catch (e) {
    if (slug && !explicitSlug && !namespaced && e.message === "Document not found") {
      const mappings = readMappings()
      mappings.delete(filename)
      mappings.delete(basename(filename))
      writeMappings(mappings)

      try {
        const result = await publish({ markdown })
        if (filename) setMapping(filename, result.slug)
        console.log(`✨ Published → ${result.url}`)
        return
      } catch (e2) {
        console.error(`✗ Publish failed: ${e2.message}`)
        process.exit(1)
      }
    }
    if (e.message.includes("too large")) {
      console.error("✗ Publish failed: Rendered HTML too large")
    } else {
      console.error(`✗ Publish failed: ${e.message}`)
    }
    process.exit(1)
  }
}

function readStdin() {
  return new Promise(resolve => {
    if (process.stdin.isTTY) console.error("Reading from stdin... (Ctrl+D to finish)")
    let data = ""
    process.stdin.setEncoding("utf-8")
    process.stdin.on("data", chunk => { data += chunk })
    process.stdin.on("end", () => resolve(data))
  })
}

async function cmdList() {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.error("✗ Not logged in. Run `openbird login` first.")
    process.exit(1)
  }

  try {
    const result = await listDocuments()
    if (!result.documents || result.documents.length === 0) {
      console.log("No published documents yet.")
      return
    }
    for (const doc of result.documents) {
      console.log(`  ${doc.slug}  ${doc.title}`)
      console.log(`    ${doc.url}`)
    }
    console.log(`  ${result.documents.length} documents`)
  } catch (e) {
    console.error(`✗ List failed: ${e.message}`)
    process.exit(1)
  }
}

async function cmdRemove(removeArgs) {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.error("✗ Not logged in. Run `openbird login` first.")
    process.exit(1)
  }

  if (removeArgs.length === 0) {
    console.error("Usage: openbird remove <file.md|slug>")
    process.exit(1)
  }

  let forceNamespaced = false
  const positional = []
  for (const arg of removeArgs) {
    if (arg === "--namespace") forceNamespaced = true
    else positional.push(arg)
  }

  const target = positional[0]
  const mappings = readMappings()
  let slug = mappings.get(target) || target
  let namespaced = forceNamespaced

  for (const [file, s] of mappings) {
    if (s === target) { slug = s; break }
  }

  if (target.includes("/")) {
    const slash = target.indexOf("/")
    slug = target.slice(slash + 1)
    namespaced = true
  }

  if (!namespaced) {
    const raw = mappings.get(target)
    if (raw) {
      const parsed = parseSlugValue(raw)
      slug = parsed.slug
      namespaced = parsed.namespaced
    }
  }

  try {
    await removeDocument(slug, { namespaced })
    removeMapping(target)
    console.log(`✓ Removed ${slug}`)
  } catch (e) {
    console.error(`✗ Remove failed: ${e.message}`)
    process.exit(1)
  }
}

function cmdHelp() {
  console.log(`openbird - Publish Markdown from the command line

Usage:
  openbird login                          Authenticate with OpenBird
  openbird register --email <email> [--password] [--username]  Register a new user (admin only)
  openbird publish <file.md>              Publish or update a document
  openbird publish --slug <slug> <file>   Publish with a custom slug
  openbird publish --namespace <file>     Publish to username/slug namespace (auto-allocates slug)
  openbird publish --slug <slug> --namespace <file>  Publish to username/slug with custom slug
  openbird publish --temp <file.md>       Publish a temporary page (1h, no login)
  openbird publish                        Read from stdin
  openbird remove <file.md|slug>          Delete a document
  openbird remove --namespace <slug>      Delete a namespaced document
  openbird list                           List published documents
  openbird help                           Show this help

Files are tracked via a .openbird mapping file in the current directory.`)
}

main().catch(e => {
  console.error(`Unexpected error: ${e.message}`)
  process.exit(1)
})
