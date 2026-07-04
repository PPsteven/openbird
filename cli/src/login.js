import { createServer } from "node:http"
import { createInterface } from "node:readline"

export function startCallbackServer(timeoutMs = 300_000) {
  return new Promise((resolve, reject) => {
    let resolveToken, rejectToken
    const tokenPromise = new Promise((res, rej) => { resolveToken = res; rejectToken = rej })
    const timeout = setTimeout(() => rejectToken(new Error("timeout")), timeoutMs)

    const server = createServer((req, res) => {
      const url = new URL(req.url, "http://127.0.0.1")
      if (url.pathname === "/callback") {
        const token = url.searchParams.get("token")
        res.writeHead(200, { "Content-Type": "text/html" })
        res.end("<html><body><h1>Logged in</h1><p>You can close this tab.</p></body></html>")
        if (token) { clearTimeout(timeout); resolveToken(token) }
      } else { res.writeHead(404); res.end() }
    })

    server.listen(0, "127.0.0.1", () => {
      resolve({ port: server.address().port, tokenPromise, close: () => { clearTimeout(timeout); server.close() } })
    })
    server.on("error", reject)
  })
}

export async function openBrowser(url) {
  try {
    const { execFile } = await import("node:child_process")
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"
    return new Promise(resolve => { execFile(cmd, [url], err => resolve(!err)) })
  } catch { return false }
}
