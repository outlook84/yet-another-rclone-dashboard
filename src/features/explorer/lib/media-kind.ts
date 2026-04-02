export type ExplorerMediaKind = "image" | "audio" | "video"

type MediaKindInput = {
  name: string
  mimeType?: string
}

const IMAGE_EXTENSIONS = new Set(["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"])
const AUDIO_EXTENSIONS = new Set(["aac", "flac", "m4a", "mp3", "oga", "ogg", "wav", "weba"])
const VIDEO_EXTENSIONS = new Set(["m4v", "mov", "mp4", "ogv", "webm"])

function getFileExtension(name: string) {
  const extension = name.split(".").pop()
  return extension ? extension.toLowerCase() : ""
}

function getExplorerMediaKind({ name, mimeType }: MediaKindInput): ExplorerMediaKind | null {
  const normalizedMimeType = mimeType?.toLowerCase()
  if (normalizedMimeType?.startsWith("image/")) {
    return "image"
  }
  if (normalizedMimeType?.startsWith("audio/")) {
    return "audio"
  }
  if (normalizedMimeType?.startsWith("video/")) {
    return "video"
  }

  const extension = getFileExtension(name)
  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image"
  }
  if (AUDIO_EXTENSIONS.has(extension)) {
    return "audio"
  }
  if (VIDEO_EXTENSIONS.has(extension)) {
    return "video"
  }

  return null
}

export { getExplorerMediaKind }
