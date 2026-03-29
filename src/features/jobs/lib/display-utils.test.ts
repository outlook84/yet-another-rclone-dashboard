import { describe, expect, it } from "vitest"
import {
  formatBytes,
  formatEta,
  formatJobKind,
  formatJobMessage,
  formatProgressPercent,
  formatRate,
  formatStatus,
  getCurrentThroughput,
  statusTone,
} from "@/features/jobs/lib/display-utils"

describe("jobs display-utils", () => {
  it("formats bytes and eta", () => {
    expect(formatBytes(2048)).toBe("2.0 KB")
    expect(formatEta(125)).toBe("2m 5s")
    expect(formatRate(2048)).toBe("2.0 KB/s")
    expect(formatRate(Number.NaN)).toBe("-")
    expect(formatProgressPercent(49.6)).toEqual({ numeric: 49.6, label: "50%" })
    expect(formatProgressPercent(Number.NaN)).toBeNull()
  })

  it("formats job kind, status, and message", () => {
    expect(formatJobKind("server_side_copy")).toBe("Server Side Copy")
    expect(formatStatus("running")).toBe("Running")
    expect(statusTone("error")).toBe("red")
    expect(formatJobMessage("")).toBe("No message reported")
  })

  it("prefers current transfer speed averages for throughput", () => {
    expect(
      getCurrentThroughput({
        speed: 999,
        transferring: [
          { speedAvg: 2048 },
          { speedAvg: 1024, speed: 512 },
        ],
      }),
    ).toBe(3072)

    expect(
      getCurrentThroughput({
        speed: 4096,
        transferring: [{ speed: 2048 }],
      }),
    ).toBe(2048)

    expect(getCurrentThroughput({ speed: 512 })).toBe(512)
    expect(
      getCurrentThroughput({
        speed: Number.NaN,
        transferring: [{ speedAvg: Number.NaN, speed: Number.NaN }],
      }),
    ).toBe(0)
  })
})
