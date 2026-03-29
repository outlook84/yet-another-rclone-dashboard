// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { JobsPage } from "@/features/jobs/pages/jobs-page"
import { renderWithProviders } from "@/test/render-with-providers"

const globalStatsQueryMock = vi.fn()
const stopJobMutationMock = vi.fn()

vi.mock("@/features/jobs/api/use-global-stats-query", () => ({
  useSharedGlobalStatsQuery: () => globalStatsQueryMock(),
}))

vi.mock("@/features/jobs/api/use-stop-job-mutation", () => ({
  useStopJobMutation: () => stopJobMutationMock(),
}))

describe("JobsPage", () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    globalStatsQueryMock.mockReturnValue({
      isLoading: false,
      isFetching: false,
      error: null,
      data: {
        stats: {
          errors: 0,
          deletes: 0,
          elapsedTime: 18,
          transferring: [
            {
              group: "job/42",
              name: "folder/Manual upload.bin",
              srcFs: "source:",
              dstFs: "dest{abc}:/",
              bytes: 512,
              size: 1024,
              speed: 128,
              speedAvg: 128,
              eta: 4,
              percentage: 50,
            },
          ],
        },
        mem: {
          Alloc: 0,
        },
        transferred: [
          {
            name: "folder/Completed.bin",
            srcFs: "source:",
            dstFs: "dest:/",
            bytes: 1024,
            size: 1024,
            completedAt: "2026-03-26T07:00:00Z",
            error: "",
            group: "job/42",
          },
        ],
      },
      refetch: vi.fn(),
    })

    stopJobMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync: vi.fn(),
    })
  })

  it("stops a running job after confirmation", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    stopJobMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync,
    })

    renderWithProviders(<JobsPage />)
    fireEvent.click(screen.getByRole("button", { name: "Stop" }))
    const dialog = await screen.findByRole("dialog")

    expect(within(dialog).getByText('Stop running job "job/42"?')).not.toBeNull()

    fireEvent.click(within(dialog).getByRole("button", { name: "Stop Job" }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith("job/42")
    })
  })

  it("formats job details for display", () => {
    renderWithProviders(<JobsPage />)

    expect(screen.getByRole("heading", { name: "Active Transfers" })).not.toBeNull()
    expect(screen.getByText("job/42")).not.toBeNull()
    expect(screen.getByText("Transferring 1 file")).not.toBeNull()
    expect(screen.getAllByText("Source: source:folder")).toHaveLength(2)
    expect(screen.getAllByText("Target Storage: dest")).toHaveLength(2)
    expect(screen.getByText("Manual upload.bin")).not.toBeNull()
    expect(screen.getByText("512 B / 1.0 KB")).not.toBeNull()
    expect(screen.getByRole("heading", { name: "Past Transfers" })).not.toBeNull()
    expect(screen.getByText("Completed.bin")).not.toBeNull()
  })

  it("hides unnamed successful past transfers", () => {
    globalStatsQueryMock.mockReturnValue({
      isLoading: false,
      isFetching: false,
      error: null,
      data: {
        stats: {
          errors: 0,
          deletes: 0,
          elapsedTime: 18,
          transferring: [],
        },
        mem: {
          Alloc: 0,
        },
        transferred: [
          {
            name: "   ",
            bytes: 0,
            size: 0,
            completedAt: "2026-03-29T03:00:00Z",
            error: "",
            group: "job/ignored",
          },
          {
            name: "folder/Shown.bin",
            bytes: 10,
            size: 10,
            completedAt: "2026-03-29T02:00:00Z",
            error: "",
            group: "job/shown",
          },
        ],
      },
      refetch: vi.fn(),
    })

    renderWithProviders(<JobsPage />)

    expect(screen.getByText("Shown.bin")).not.toBeNull()
    expect(screen.queryByText("-")).toBeNull()
  })

  it("keeps unnamed failed past transfers visible in the failed filter", () => {
    globalStatsQueryMock.mockReturnValue({
      isLoading: false,
      isFetching: false,
      error: null,
      data: {
        stats: {
          errors: 1,
          deletes: 0,
          elapsedTime: 18,
          transferring: [],
        },
        mem: {
          Alloc: 0,
        },
        transferred: [
          {
            name: "   ",
            what: "transferring",
            srcFs: "source:",
            dstFs: "dest:/",
            bytes: 0,
            size: 0,
            completedAt: "2026-03-29T03:00:00Z",
            error: "boom",
            group: "job/failed",
          },
        ],
      },
      refetch: vi.fn(),
    })

    renderWithProviders(<JobsPage />)
    fireEvent.click(screen.getByRole("button", { name: "Failed" }))

    expect(screen.getByText("boom")).not.toBeNull()
    expect(screen.getByText("transferring")).not.toBeNull()
    expect(screen.getAllByText("Failed").length).toBeGreaterThan(0)
  })

  it("collapses the active transfers section", () => {
    renderWithProviders(<JobsPage />)

    fireEvent.click(screen.getByRole("button", { name: /Active Transfers/i }))

    expect(screen.queryByText("Manual upload.bin")).toBeNull()
    expect(screen.getByText("1 group · 128 B/s")).not.toBeNull()
  })

  it("does not render NaN percent or invalid timestamps for bad transfer stats", () => {
    globalStatsQueryMock.mockReturnValue({
      isLoading: false,
      isFetching: false,
      error: null,
      data: {
        stats: {
          errors: 0,
          deletes: 0,
          elapsedTime: 18,
          speed: Number.NaN,
          transferring: [
            {
              group: "job/bad",
              name: "folder/Bad.bin",
              srcFs: "source:",
              dstFs: "dest:/",
              bytes: 10,
              size: 20,
              speed: Number.NaN,
              eta: Number.NaN,
              percentage: Number.NaN,
            },
          ],
        },
        mem: {
          Alloc: 0,
        },
        transferred: [
          {
            name: "folder/Done.bin",
            bytes: 10,
            size: 20,
            completedAt: "not-a-date",
            error: "",
            group: "job/bad",
          },
        ],
      },
      refetch: vi.fn(),
    })

    renderWithProviders(<JobsPage />)

    expect(screen.queryByText("NaN%")).toBeNull()
    expect(screen.queryByText("Invalid Date")).toBeNull()
    expect(screen.getByText("Calculating")).not.toBeNull()
    expect(screen.getAllByText("-").length).toBeGreaterThan(0)
  })
})
