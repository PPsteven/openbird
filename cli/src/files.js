export const ALLOWED_EXTENSIONS = new Set([".md", ".markdown", ".mdx", ".txt", ".text"])

export function isAllowedFile(filename) {
  const dotIndex = filename.lastIndexOf(".")
  if (dotIndex <= 0) return true
  const ext = filename.slice(dotIndex).toLowerCase()
  return ALLOWED_EXTENSIONS.has(ext)
}
