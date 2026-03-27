import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { TransferStats } from "@/shared/api/contracts/jobs"

interface JobErrorEntry {
  id: string
  message: string
  occurredAt: string
  totalErrors: number
  increment: number
}

interface JobErrorState {
  sourceKey: string | null
  lastSeenErrorCount: number
  lastSeenErrorMessage: string | null
  entries: JobErrorEntry[]
  ingestSnapshot: (sourceKey: string, stats?: TransferStats) => void
  clear: () => void
}

const MAX_ERROR_ENTRIES = 30

const useJobErrorStore = create<JobErrorState>()(
  persist(
    (set, get) => ({
      sourceKey: null,
      lastSeenErrorCount: 0,
      lastSeenErrorMessage: null,
      entries: [],
      ingestSnapshot: (sourceKey, stats) => {
        if (!stats) {
          return
        }

        const errorCount = stats.errors ?? 0
        const errorMessage = stats.lastError?.trim() || null
        const state = get()

        if (state.sourceKey !== sourceKey) {
          set({
            sourceKey,
            lastSeenErrorCount: errorCount,
            lastSeenErrorMessage: errorMessage,
            entries: [],
          })
          return
        }

        if (!errorMessage || errorCount <= state.lastSeenErrorCount) {
          set({
            lastSeenErrorCount: errorCount,
            lastSeenErrorMessage: errorMessage,
          })
          return
        }

        const increment = Math.max(errorCount - state.lastSeenErrorCount, 1)
        const now = new Date().toISOString()
        const current = state.entries[0]
        const nextEntries =
          current && current.message === errorMessage
            ? [
                {
                  ...current,
                  occurredAt: now,
                  totalErrors: errorCount,
                  increment: current.increment + increment,
                },
                ...state.entries.slice(1),
              ]
            : [
                {
                  id: `${now}-${errorCount}`,
                  message: errorMessage,
                  occurredAt: now,
                  totalErrors: errorCount,
                  increment,
                },
                ...state.entries,
              ]

        set({
          sourceKey,
          lastSeenErrorCount: errorCount,
          lastSeenErrorMessage: errorMessage,
          entries: nextEntries.slice(0, MAX_ERROR_ENTRIES),
        })
      },
      clear: () =>
        set({
          sourceKey: null,
          lastSeenErrorCount: 0,
          lastSeenErrorMessage: null,
          entries: [],
        }),
    }),
    {
      name: "yard-job-errors",
    },
  ),
)

export { useJobErrorStore }
