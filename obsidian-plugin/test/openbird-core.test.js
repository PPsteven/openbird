const test = require("node:test")
const assert = require("node:assert/strict")

const {
  DEFAULT_API_BASE,
  normalizeApiBase,
  buildPublishBody,
  extractMarkdownImageRefs,
  rewriteMarkdownImages,
  rewriteWikiImageEmbeds,
  getSlugFromMappingValue,
} = require("../openbird-core")

test("normalizeApiBase trims whitespace and trailing slashes", () => {
  assert.equal(normalizeApiBase(" https://example.com/// "), "https://example.com")
})

test("normalizeApiBase falls back to the public OpenBird service", () => {
  assert.equal(normalizeApiBase(""), DEFAULT_API_BASE)
  assert.equal(normalizeApiBase(null), DEFAULT_API_BASE)
})

test("buildPublishBody only includes optional fields when requested", () => {
  assert.deepEqual(buildPublishBody({ markdown: "# Hello" }), { markdown: "# Hello" })
  assert.deepEqual(buildPublishBody({
    markdown: "# Hello",
    slug: "my-note",
    namespaced: true,
    temp: true,
  }), {
    markdown: "# Hello",
    slug: "my-note",
    namespaced: true,
    temp: true,
  })
})

test("extractMarkdownImageRefs ignores remote URLs and keeps local references once", () => {
  const refs = extractMarkdownImageRefs([
    "![local](assets/a.png)",
    "![same](assets/a.png)",
    "![remote](https://example.com/a.png)",
    "![encoded](Images/My%20Photo.jpg)",
  ].join("\n"))

  assert.deepEqual(refs, ["assets/a.png", "Images/My Photo.jpg"])
})

test("rewriteMarkdownImages replaces only matching local markdown image targets", () => {
  const markdown = [
    "![A](assets/a.png)",
    "![Remote](https://example.com/a.png)",
    "![B](Images/My%20Photo.jpg)",
  ].join("\n")

  assert.equal(
    rewriteMarkdownImages(markdown, new Map([
      ["assets/a.png", "https://cdn.example/a.png"],
      ["Images/My Photo.jpg", "https://cdn.example/photo.jpg"],
    ])),
    [
      "![A](https://cdn.example/a.png)",
      "![Remote](https://example.com/a.png)",
      "![B](https://cdn.example/photo.jpg)",
    ].join("\n")
  )
})

test("rewriteWikiImageEmbeds converts Obsidian image embeds to markdown images", () => {
  const markdown = "before ![[Pasted image.png|300]] and ![[docs/note.md]] after"

  assert.equal(
    rewriteWikiImageEmbeds(markdown, new Map([
      ["Pasted image.png", "https://cdn.example/pasted.png"],
    ])),
    "before ![Pasted image.png](https://cdn.example/pasted.png) and ![[docs/note.md]] after"
  )
})

test("getSlugFromMappingValue parses namespaced and plain slugs", () => {
  assert.deepEqual(getSlugFromMappingValue("@jacky/my-note"), {
    slug: "my-note",
    namespaced: true,
  })
  assert.deepEqual(getSlugFromMappingValue("quiet-blue-lake"), {
    slug: "quiet-blue-lake",
    namespaced: false,
  })
})
