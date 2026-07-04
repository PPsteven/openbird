#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs"
import { basename } from "node:path"
import { createInterface } from "node:readline"
import { getApiKey, saveApiKey, getCredentialsPath, API_BASE, VERSION } from "./config.js"
import { publish, listDocuments, removeDocument } from "./api.js"
import { readMappings, setMapping, removeMapping, writeMappings } from "./mapping.js"
import { startCallbackServer, openBrowser } from "./login.js"
import { isAllowedFile, ALLOWED_EXTENSIONS } from "./files.js"
import { uploadAndRewriteImages } from "./images.js"

const args = process.argv.slice(2)
const command = args[0]

async function main() {
  switch (command) {
    case "login": return cmdLogin()
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

async function cmdPublish(publishArgs) {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.error("✗ Not logged in. Run `openbird login` first.")
    process.exit(1)
  }

  let explicitSlug = null
  const positional = []
  for (let i = 0; i < publishArgs.length; i++) {
    if (publishArgs[i] === "--slug" && i + 1 < publishArgs.length) {
      explicitSlug = publishArgs[i + 1]
      i++
    } else {
      positional.push(publishArgs[i])
    }
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
    markdown = await uploadAndRewriteImages(markdown, filename)
  }

  let slug = explicitSlug
  if (!slug && filename) {
    const mappings = readMappings()
    slug = mappings.get(filename) || mappings.get(basename(filename)) || null
  }

  try {
    const result = await publish({ markdown, slug })
    if (filename) setMapping(filename, result.slug)
    if (result.created) {
      console.log(`✨ Published → ${result.url}`)
    } else {
      console.log(`✓ Updated → ${result.url}`)
    }
  } catch (e) {
    if (slug && !explicitSlug && e.message === "Document not found") {
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

  const target = removeArgs[0]
  const mappings = readMappings()
  let slug = mappings.get(target) || target

  for (const [file, s] of mappings) {
    if (s === target) { slug = s; break }
  }

  try {
    await removeDocument(slug)
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
  openbird publish <file.md>              Publish or update a document
  openbird publish --slug <slug> <file>   Update a specific document
  openbird publish                        Read from stdin
  openbird remove <file.md|slug>          Delete a document
  openbird list                           List published documents
  openbird help                           Show this help

Files are tracked via a .openbird mapping file in the current directory.`)
}

main().catch(e => {
  console.error(`Unexpected error: ${e.message}`)
  process.exit(1)
})
