/**
 * For a server-side copy (e.g. macOS local→local via `copyfile()`, S3→S3,
 * GCS rewrite), rclone never increments the per-transfer `bytes` field —
 * those bytes are only counted globally in `core/stats:serverSideCopyBytes`.
 *
 * If we render `item.bytes` directly, completed server-side copies appear as
 * "0 B / X.Y GB Completed", which reads as a silent data-loss bug even though
 * the file was copied correctly.
 *
 * This helper returns the best available "bytes moved" value:
 *   - the live `bytes` counter if it has any data
 *   - else, for transfers that completed without error, the full `size`
 *     (server-side copies move the whole file atomically — if it completed,
 *     all the bytes moved)
 *   - else 0 (in-flight server-side copy, or a transfer that never ran)
 *
 * See: https://github.com/outlook84/yet-another-rclone-dashboard/issues/3
 * See: https://github.com/rclone/rclone/issues/6849
 */
export interface EffectiveBytesItem {
  bytes?: number
  size?: number
  completedAt?: string
  error?: string
}

export function effectiveBytes(item: EffectiveBytesItem): number {
  if ((item.bytes ?? 0) > 0) return item.bytes ?? 0
  if (item.completedAt && !item.error) return item.size ?? 0
  return 0
}

/**
 * Detect "we are in flight and rclone has not reported any progress yet".
 *
 * This is the signal that the user is mid-server-side-copy: rclone has
 * accepted the transfer (it appears in the active list with a size and a
 * name) but no bytes have flowed through rclone's accounting hook because
 * the actual byte movement is happening in the kernel (or remote backend).
 *
 * For these items rendering "0 B / X.Y GB" is misleading — better to label
 * the transfer explicitly so the user understands why there's no progress.
 *
 * Detection rule: no bytes data, no completion timestamp, and we have at
 * least a known size to compare against. (The size > 0 check rules out
 * uninitialized rows.)
 */
export function isInFlightWithoutProgress(item: EffectiveBytesItem): boolean {
  return (
    (item.bytes ?? 0) === 0 &&
    !item.completedAt &&
    (item.size ?? 0) > 0
  )
}
