import { normalizePath } from "@/features/explorer/lib/path-utils"

function buildRcServeUrl(baseUrl: string, remote: string, path: string) {
  const normalizedPath = normalizePath(path)
  const encodedRemotePrefix = encodeURIComponent(`[${remote}:]`)
  const encodedPath = normalizedPath
    ? normalizedPath
        .split("/")
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join("/")
    : ""
  const root = baseUrl.replace(/\/+$/, "")
  return encodedPath ? `${root}/${encodedRemotePrefix}/${encodedPath}` : `${root}/${encodedRemotePrefix}/`
}

function buildRcServeProbeUrl(baseUrl: string) {
  const root = baseUrl.replace(/\/+$/, "")
  return `${root}/*`
}

export { buildRcServeProbeUrl, buildRcServeUrl }
