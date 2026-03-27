function normalizePath(path: string) {
  return path.replace(/^\/+|\/+$/g, "")
}

function joinPath(base: string, name: string) {
  const normalizedBase = normalizePath(base)
  const normalizedName = normalizePath(name)

  if (!normalizedBase) return normalizedName
  if (!normalizedName) return normalizedBase

  return `${normalizedBase}/${normalizedName}`
}

function parentPath(path: string) {
  const normalized = normalizePath(path)
  if (!normalized) return ""

  const segments = normalized.split("/")
  segments.pop()
  return segments.join("/")
}

export { normalizePath, joinPath, parentPath }
