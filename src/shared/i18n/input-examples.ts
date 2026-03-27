import type { AppLocale } from "@/shared/i18n/locale-store"

type InputExample =
  | { kind: "technical"; value: string }
  | { kind: "localized"; en: string; "zh-CN": string }

function technical(value: string): InputExample {
  return { kind: "technical", value }
}

function localized(en: string, zhCN: string): InputExample {
  return { kind: "localized", en, "zh-CN": zhCN }
}

// Strategy:
// - Preserve protocol, path, unit, and config syntax literally across locales.
// - Localize placeholders only when they are purely illustrative user-facing names.
// - Keep sentence copy localized, but inject examples from this shared catalog.
const inputExamples = {
  rcBaseUrl: technical("http://localhost:5572"),
  remoteFs: technical("demo:"),
  mountPoint: technical("/mnt/demo"),
  remotePath: technical("remote:/path"),
  remoteConfigDump: technical('{"remote-a":{"type":"s3"},"remote-b":{"type":"webdav"}}'),
  newFolderName: localized("new-folder", "新建文件夹"),
  bandwidthLimit: [technical("off"), technical("10M"), technical("10M:2M")],
  timeout: [technical("5m"), technical("30s")],
  connectTimeout: [technical("1m"), technical("15s")],
} as const

function resolveInputExample(example: InputExample, locale: AppLocale) {
  if (example.kind === "technical") {
    return example.value
  }

  return locale === "zh-CN" ? example["zh-CN"] : example.en
}

function quoteInputExample(example: string, locale: AppLocale) {
  return locale === "zh-CN" ? `“${example}”` : `"${example}"`
}

function formatInputExamples(
  examples: readonly InputExample[],
  locale: AppLocale,
  options?: { quoted?: boolean },
) {
  const values = examples.map((example) => resolveInputExample(example, locale))

  if (options?.quoted) {
    return values.map((value) => quoteInputExample(value, locale)).join(locale === "zh-CN" ? "、" : ", ")
  }

  return values.join(locale === "zh-CN" ? "、" : ", ")
}

export { formatInputExamples, inputExamples, resolveInputExample }
