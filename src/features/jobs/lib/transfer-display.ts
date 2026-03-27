import type { PastTransferItem, TransferItem } from "@/shared/api/contracts/jobs"

type ParsedFsLabel = {
  remoteLabel: string
  basePath: string | null
}

type TransferNameParts = {
  leafName: string
  parentPath: string | null
}

type TransferDisplayModel = {
  leafName: string
  sourceText: string | null
  destinationText: string | null
  destinationUsesStorageLabel: boolean
}

function parseFsLabel(value?: string): ParsedFsLabel | null {
  if (!value) {
    return null
  }

  const match = value.match(/^([^:{]+)(?:\{[^}]+\})?:(.*)$/)
  if (!match) {
    return {
      remoteLabel: value,
      basePath: null,
    }
  }

  const [, remoteName, remotePath] = match
  const normalizedPath = remotePath.trim()

  return {
    remoteLabel: remoteName,
    basePath: !normalizedPath || normalizedPath === "/" ? null : normalizedPath,
  }
}

function formatTransferEndpoint(value?: string) {
  const parsed = parseFsLabel(value)
  if (!parsed) {
    return null
  }

  return parsed.basePath ? `${parsed.remoteLabel}:${parsed.basePath}` : parsed.remoteLabel
}

function splitTransferName(value?: string): TransferNameParts {
  if (!value) {
    return {
      leafName: "-",
      parentPath: null,
    }
  }

  const normalizedValue = value.replace(/\\/g, "/")
  const segments = normalizedValue.split("/").filter(Boolean)

  if (segments.length <= 1) {
    return {
      leafName: normalizedValue,
      parentPath: null,
    }
  }

  return {
    leafName: segments[segments.length - 1] ?? normalizedValue,
    parentPath: segments.slice(0, -1).join("/"),
  }
}

function formatTransferSource(value: string | undefined, relativeParentPath: string | null) {
  const parsed = parseFsLabel(value)
  if (!parsed) {
    return null
  }

  if (parsed.basePath) {
    return `${parsed.remoteLabel}:${parsed.basePath}`
  }

  if (relativeParentPath) {
    return `${parsed.remoteLabel}:${relativeParentPath}`
  }

  return parsed.remoteLabel
}

function compareTransferDatesDesc(left?: string, right?: string) {
  const leftTime = left ? Date.parse(left) : Number.NaN
  const rightTime = right ? Date.parse(right) : Number.NaN

  if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
    return 0
  }

  if (Number.isNaN(leftTime)) {
    return 1
  }

  if (Number.isNaN(rightTime)) {
    return -1
  }

  return rightTime - leftTime
}

function buildTransferDisplayModel(item: Pick<TransferItem, "name" | "srcFs" | "dstFs"> | Pick<PastTransferItem, "name" | "srcFs" | "dstFs">): TransferDisplayModel {
  const { leafName, parentPath } = splitTransferName(item.name)
  const destinationParsed = parseFsLabel(item.dstFs)

  return {
    leafName,
    sourceText: formatTransferSource(item.srcFs, parentPath),
    destinationText: formatTransferEndpoint(item.dstFs),
    destinationUsesStorageLabel: !destinationParsed?.basePath,
  }
}

function buildGroupDisplayModel(items: Array<Pick<TransferItem, "name" | "srcFs" | "dstFs">>): TransferDisplayModel {
  const sharedSrcFs = items.every((item) => item.srcFs === items[0]?.srcFs) ? items[0]?.srcFs : undefined
  const sharedDstFs = items.every((item) => item.dstFs === items[0]?.dstFs) ? items[0]?.dstFs : undefined
  const singleItemParentPath = items.length === 1 ? splitTransferName(items[0]?.name).parentPath : null
  const destinationParsed = parseFsLabel(sharedDstFs)

  return {
    leafName: items.length === 1 ? splitTransferName(items[0]?.name).leafName : "-",
    sourceText: formatTransferSource(sharedSrcFs, singleItemParentPath),
    destinationText: formatTransferEndpoint(sharedDstFs),
    destinationUsesStorageLabel: !destinationParsed?.basePath,
  }
}

export {
  buildGroupDisplayModel,
  buildTransferDisplayModel,
  compareTransferDatesDesc,
  parseFsLabel,
  splitTransferName,
}
