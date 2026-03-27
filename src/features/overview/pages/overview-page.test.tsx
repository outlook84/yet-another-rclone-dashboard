// @vitest-environment jsdom

import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { OverviewPage } from "@/features/overview/pages/overview-page"
import { useConnectionStore } from "@/shared/store/connection-store"
import { useOverviewStore } from "@/features/overview/store/overview-store"
import { renderWithProviders } from "@/test/render-with-providers"

const remotesQueryMock = vi.fn()
const sharedGlobalStatsQueryMock = vi.fn()
const connectionHealthQueryMock = vi.fn()
const statsResetMutationMock = vi.fn()
const confirmMock = vi.fn()
const fixedNow = new Date("2026-03-27T08:00:00.000Z").getTime()

vi.mock("@/features/remotes/api/use-remotes-query", () => ({
  useRemotesQuery: () => remotesQueryMock(),
}))

vi.mock("@/features/jobs/api/use-global-stats-query", () => ({
  useSharedGlobalStatsQuery: () => sharedGlobalStatsQueryMock(),
}))

vi.mock("@/shared/hooks/use-connection-health-query", () => ({
  useConnectionHealthQuery: () => connectionHealthQueryMock(),
}))

vi.mock("@/features/jobs/api/use-stats-reset-mutation", () => ({
  useStatsResetMutation: () => statsResetMutationMock(),
}))

vi.mock("@/shared/components/confirm-provider", async () => {
  const actual = await vi.importActual<typeof import("@/shared/components/confirm-provider")>(
    "@/shared/components/confirm-provider",
  )
  return {
    ...actual,
    useConfirm: () => confirmMock,
  }
})

describe("OverviewPage", () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(fixedNow)
    confirmMock.mockResolvedValue(false)

    useConnectionStore.setState({
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      basicCredentials: {
        username: "gui",
        password: "secret",
      },
      lastValidatedAt: "2026-03-26T07:00:00.000Z",
      lastServerInfo: {
        product: "rclone",
        version: "1.70.3",
        apiBaseUrl: "http://localhost:5572",
      },
    })

    useOverviewStore.setState({
      scopeKey: "http://localhost:5572::basic::gui",
      historyByScope: {
        "http://localhost:5572::basic::gui": [
          { at: fixedNow - 1000, value: 0 },
        ],
      },
      speedHistory: [{ at: fixedNow - 1000, value: 0 }],
      memStats: { HeapAlloc: 58 * 1024 * 1024 } as never,
    })

    remotesQueryMock.mockReturnValue({
      data: [{ name: "demo" }],
      error: null,
    })

    sharedGlobalStatsQueryMock.mockReturnValue({
      data: {
        stats: {
          elapsedTime: 120,
          transfers: 25,
          bytes: 18 * 1024 * 1024 * 1024,
          errors: 8,
          deletes: 24,
          transferring: [],
        },
        globalStats: {},
      },
      dataUpdatedAt: fixedNow,
      error: null,
    })

    connectionHealthQueryMock.mockReturnValue({
      data: { latencyMs: 280 },
      error: null,
    })

    statsResetMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      mutate: vi.fn(),
    })
  })

  it("renders the latest global error when present", () => {
    sharedGlobalStatsQueryMock.mockReturnValue({
      data: {
        stats: {
          elapsedTime: 120,
          transfers: 25,
          bytes: 18 * 1024 * 1024 * 1024,
          errors: 8,
          deletes: 24,
          transferring: [],
        },
        globalStats: {
          lastError: "rate limit reached",
        },
      },
      error: null,
    })

    renderWithProviders(<OverviewPage />)

    expect(screen.getByText("Latest Global Error")).not.toBeNull()
    expect(screen.getByText("rate limit reached")).not.toBeNull()
  })

  it("shows the fallback message when there is no global error yet", () => {
    renderWithProviders(<OverviewPage />)

    expect(
      screen.getByText((_, element) => {
        return (
          element?.tagName === "P" &&
          (element.textContent?.includes("No recent errors. Waiting for") ?? false)
        )
      }),
    ).not.toBeNull()
    expect(screen.getByText("core/stats(group=global_stats).lastError")).not.toBeNull()
  })

  it("does not keep rendering throughput samples older than the 5 minute window", () => {
    const staleSampleAt = fixedNow - 6 * 60 * 1000

    useOverviewStore.setState({
      scopeKey: "http://localhost:5572::basic::gui",
      historyByScope: {
        "http://localhost:5572::basic::gui": [{ at: staleSampleAt, value: 1024 }],
      },
      speedHistory: [{ at: staleSampleAt, value: 1024 }],
      memStats: { HeapAlloc: 58 * 1024 * 1024 } as never,
    })

    sharedGlobalStatsQueryMock.mockReturnValue({
      data: {
        stats: {
          elapsedTime: 120,
          transfers: 25,
          bytes: 18 * 1024 * 1024 * 1024,
          errors: 8,
          deletes: 24,
          transferring: [],
        },
        globalStats: {},
      },
      dataUpdatedAt: staleSampleAt,
      error: null,
    })

    const { container } = renderWithProviders(<OverviewPage />)

    expect(container.querySelector('path[stroke="var(--app-accent)"]')).toBeNull()
  })
})
