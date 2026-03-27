import type { FsInfo } from "@/shared/api/contracts/explorer"
import type { RemoteDetail } from "@/shared/api/contracts/remotes"

function countConfigKeys(detail: RemoteDetail | null | undefined) {
  return detail ? Object.keys(detail.config ?? {}).length : 0
}

function countEnabledFeatures(fsInfo: FsInfo | null | undefined) {
  return fsInfo?.features
    ? Object.values(fsInfo.features).filter((value) => Boolean(value)).length
    : 0
}

function formatHashSupport(fsInfo: FsInfo | null | undefined) {
  return fsInfo?.hashes?.length ? fsInfo.hashes.join(", ") : "Unknown"
}

function formatPublicLinkSupport(fsInfo: FsInfo | null | undefined) {
  return fsInfo?.features?.PublicLink ? "Supported" : "Not reported"
}

export { countConfigKeys, countEnabledFeatures, formatHashSupport, formatPublicLinkSupport }
