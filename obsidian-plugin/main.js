const {
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  normalizePath,
  requestUrl,
} = require("obsidian")

const {
  DEFAULT_API_BASE,
  USER_AGENT,
  MAX_IMAGE_SIZE,
  normalizeApiBase,
  buildPublishBody,
  extractMarkdownImageRefs,
  extractWikiImageRefs,
  rewriteMarkdownImages,
  rewriteWikiImageEmbeds,
  getImageContentType,
  isSupportedImagePath,
} = require("./openbird-core")

const DEFAULT_SETTINGS = {
  apiBase: DEFAULT_API_BASE,
  apiKey: "",
  defaultTemp: false,
  uploadImages: true,
  namespaced: false,
  mappings: {},
}

module.exports = class OpenBirdPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
    this.settings.mappings = this.settings.mappings || {}

    this.addRibbonIcon("send", "Publish current note to OpenBird", () => {
      this.publishActiveNote({ temp: this.settings.defaultTemp })
    })

    this.addCommand({
      id: "publish-current-note",
      name: "Publish current note",
      checkCallback: (checking) => this.withActiveMarkdownFile(checking, (file) => {
        this.publishFile(file, { temp: this.settings.defaultTemp })
      }),
    })

    this.addCommand({
      id: "publish-current-note-temp",
      name: "Publish current note temporarily",
      checkCallback: (checking) => this.withActiveMarkdownFile(checking, (file) => {
        this.publishFile(file, { temp: true })
      }),
    })

    this.addCommand({
      id: "publish-current-note-with-slug",
      name: "Publish current note with custom slug",
      checkCallback: (checking) => this.withActiveMarkdownFile(checking, (file) => {
        new SlugModal(this.app, async (slug) => {
          await this.publishFile(file, { temp: false, customSlug: slug })
        }).open()
      }),
    })

    this.addCommand({
      id: "remove-current-note",
      name: "Remove current note from OpenBird",
      checkCallback: (checking) => this.withActiveMarkdownFile(checking, (file) => {
        this.removeFile(file)
      }),
    })

    this.addSettingTab(new OpenBirdSettingTab(this.app, this))
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

  withActiveMarkdownFile(checking, callback) {
    const file = this.app.workspace.getActiveFile()
    const ok = file instanceof TFile && file.extension.toLowerCase() === "md"
    if (checking) return ok
    if (!ok) {
      new Notice("OpenBird: open a Markdown note first.")
      return false
    }
    callback(file)
    return true
  }

  publishActiveNote(options) {
    this.withActiveMarkdownFile(false, (file) => this.publishFile(file, options))
  }

  async publishFile(file, { temp = false, customSlug = null } = {}) {
    if (!temp && !this.settings.apiKey.trim()) {
      new Notice("OpenBird: set an API key in plugin settings, or use temporary publish.")
      return
    }

    const notice = new Notice("OpenBird: publishing...", 0)
    try {
      let markdown = await this.app.vault.cachedRead(file)
      if (!temp && this.settings.uploadImages) {
        markdown = await this.uploadAndRewriteImages(markdown, file)
      }

      const mapping = this.settings.mappings[file.path] || null
      const slug = customSlug || (mapping && mapping.slug) || null
      const namespaced = !temp && (mapping ? mapping.namespaced : this.settings.namespaced)
      const body = buildPublishBody({
        markdown,
        slug,
        namespaced,
        temp,
        title: file.basename,
      })

      const result = await this.requestOpenBird({
        method: "POST",
        path: "/api/v1/publish",
        body,
        apiKey: temp ? "" : this.settings.apiKey,
      })

      if (!temp) {
        this.settings.mappings[file.path] = {
          slug: result.slug,
          namespaced: Boolean(result.username) || Boolean(namespaced),
          username: result.username || null,
          url: result.url,
          title: result.title || file.basename,
          updatedAt: new Date().toISOString(),
        }
        await this.saveSettings()
      }

      await copyToClipboard(result.url)
      notice.hide()
      new Notice(`OpenBird: ${result.created === false ? "updated" : "published"} and copied URL.`)
    } catch (error) {
      notice.hide()
      new Notice(`OpenBird publish failed: ${error.message}`)
      console.error(error)
    }
  }

  async removeFile(file) {
    const mapping = this.settings.mappings[file.path]
    if (!mapping || !mapping.slug) {
      new Notice("OpenBird: no published mapping for this note.")
      return
    }
    if (!this.settings.apiKey.trim()) {
      new Notice("OpenBird: set an API key before removing published notes.")
      return
    }

    try {
      let path = `/api/v1/documents?slug=${encodeURIComponent(mapping.slug)}`
      if (mapping.namespaced) path += "&namespaced=true"
      await this.requestOpenBird({
        method: "DELETE",
        path,
        apiKey: this.settings.apiKey,
      })
      delete this.settings.mappings[file.path]
      await this.saveSettings()
      new Notice("OpenBird: removed published note.")
    } catch (error) {
      new Notice(`OpenBird remove failed: ${error.message}`)
      console.error(error)
    }
  }

  async requestOpenBird({ method, path, body, apiKey }) {
    const headers = { "User-Agent": USER_AGENT }
    if (apiKey) headers.Authorization = `Bearer ${apiKey.trim()}`

    const options = {
      url: `${normalizeApiBase(this.settings.apiBase)}${path}`,
      method,
      headers,
      throw: false,
    }

    if (body) {
      options.body = JSON.stringify(body)
      options.contentType = "application/json"
    }

    const response = await requestUrl(options)
    if (response.status < 200 || response.status >= 300) {
      throw new Error(readResponseError(response))
    }
    return response.json || {}
  }

  async uploadAndRewriteImages(markdown, sourceFile) {
    const urlMap = new Map()
    const refs = [
      ...extractMarkdownImageRefs(markdown),
      ...extractWikiImageRefs(markdown),
    ]

    for (const ref of refs) {
      if (urlMap.has(ref)) continue
      const file = this.resolveVaultFile(ref, sourceFile)
      if (!file) continue
      const url = await this.uploadImage(file)
      if (url) urlMap.set(ref, url)
    }

    if (urlMap.size === 0) return markdown
    return rewriteWikiImageEmbeds(rewriteMarkdownImages(markdown, urlMap), urlMap)
  }

  resolveVaultFile(ref, sourceFile) {
    const fromCache = this.app.metadataCache.getFirstLinkpathDest(ref, sourceFile.path)
    if (fromCache instanceof TFile && isSupportedImagePath(fromCache.path)) return fromCache

    const direct = this.app.vault.getAbstractFileByPath(normalizePath(ref))
    if (direct instanceof TFile && isSupportedImagePath(direct.path)) return direct

    const parent = sourceFile.parent && sourceFile.parent.path ? sourceFile.parent.path : ""
    const relativePath = normalizePath(parent ? `${parent}/${ref}` : ref)
    const relative = this.app.vault.getAbstractFileByPath(relativePath)
    if (relative instanceof TFile && isSupportedImagePath(relative.path)) return relative

    return null
  }

  async uploadImage(file) {
    const contentType = getImageContentType(file.path)
    if (!contentType) return null

    const buffer = await this.app.vault.readBinary(file)
    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      new Notice(`OpenBird: skipped image over 10 MB: ${file.name}`)
      return null
    }

    const form = new FormData()
    form.append("file", new Blob([buffer], { type: contentType }), file.name)

    const response = await fetch(`${normalizeApiBase(this.settings.apiBase)}/api/v1/upload-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.settings.apiKey.trim()}`,
        "User-Agent": USER_AGENT,
      },
      body: form,
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error((data && data.error) || `Image upload failed: HTTP ${response.status}`)
    }
    return data && data.url
  }
}

function readResponseError(response) {
  if (response.json && response.json.error) return response.json.error
  if (response.text) return response.text
  return `HTTP ${response.status}`
}

async function copyToClipboard(value) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    // Clipboard access is best-effort in Obsidian.
  }
}

class SlugModal extends Modal {
  constructor(app, onSubmit) {
    super(app)
    this.onSubmit = onSubmit
    this.slug = ""
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()
    contentEl.createEl("h2", { text: "Publish to OpenBird" })

    new Setting(contentEl)
      .setName("Slug")
      .setDesc("Use lowercase letters, numbers, and hyphens.")
      .addText((text) => {
        text.setPlaceholder("my-note")
        text.onChange((value) => {
          this.slug = value.trim()
        })
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") this.submit()
        })
        setTimeout(() => text.inputEl.focus(), 0)
      })

    new Setting(contentEl)
      .addButton((button) => {
        button.setButtonText("Publish")
        button.setCta()
        button.onClick(() => this.submit())
      })
  }

  submit() {
    if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(this.slug)) {
      new Notice("OpenBird: invalid slug.")
      return
    }
    this.close()
    this.onSubmit(this.slug)
  }

  onClose() {
    this.contentEl.empty()
  }
}

class OpenBirdSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display() {
    const { containerEl } = this
    containerEl.empty()
    containerEl.createEl("h2", { text: "OpenBird" })

    new Setting(containerEl)
      .setName("API base URL")
      .setDesc("Use the public OpenBird service or your self-hosted Worker URL.")
      .addText((text) => {
        text.setPlaceholder(DEFAULT_API_BASE)
        text.setValue(this.plugin.settings.apiBase)
        text.onChange(async (value) => {
          this.plugin.settings.apiBase = normalizeApiBase(value)
          await this.plugin.saveSettings()
        })
      })

    new Setting(containerEl)
      .setName("API key")
      .setDesc("Paste an OpenBird API key that starts with ob_. Leave empty for temporary publishing only.")
      .addText((text) => {
        text.inputEl.type = "password"
        text.setPlaceholder("ob_...")
        text.setValue(this.plugin.settings.apiKey)
        text.onChange(async (value) => {
          this.plugin.settings.apiKey = value.trim()
          await this.plugin.saveSettings()
        })
      })

    new Setting(containerEl)
      .setName("Default to temporary publish")
      .setDesc("Temporary pages do not require an API key and expire after 1 hour.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.defaultTemp)
        toggle.onChange(async (value) => {
          this.plugin.settings.defaultTemp = value
          await this.plugin.saveSettings()
        })
      })

    new Setting(containerEl)
      .setName("Upload local images")
      .setDesc("Upload supported local attachments before publishing authenticated notes.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.uploadImages)
        toggle.onChange(async (value) => {
          this.plugin.settings.uploadImages = value
          await this.plugin.saveSettings()
        })
      })

    new Setting(containerEl)
      .setName("Publish new notes to namespace")
      .setDesc("Use @username/slug URLs for new custom-slug publishes. Your OpenBird account must have a username.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.namespaced)
        toggle.onChange(async (value) => {
          this.plugin.settings.namespaced = value
          await this.plugin.saveSettings()
        })
      })

    new Setting(containerEl)
      .setName("Saved mappings")
      .setDesc(`${Object.keys(this.plugin.settings.mappings || {}).length} notes have OpenBird publish mappings.`)
      .addButton((button) => {
        button.setButtonText("Clear")
        button.onClick(async () => {
          this.plugin.settings.mappings = {}
          await this.plugin.saveSettings()
          this.display()
        })
      })
  }
}
