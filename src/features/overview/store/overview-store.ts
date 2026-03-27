import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ThroughputSample {
  at: number
  value: number
}

interface OverviewState {
  scopeKey: string | null
  historyByScope: Record<string, ThroughputSample[]>
  speedHistory: ThroughputSample[]
  memStats: import("@/shared/api/contracts/session").MemStats | null
  setScope: (scopeKey: string) => void
  appendSpeedSample: (value: number, sampledAt: number, windowMs: number) => void
  setMemStats: (memStats: import("@/shared/api/contracts/session").MemStats | null) => void
}

const useOverviewStore = create<OverviewState>()(
  persist(
    (set) => ({
      scopeKey: null,
      historyByScope: {},
      speedHistory: [],
      memStats: null,
      setScope: (scopeKey) =>
        set((state) => {
          if (state.scopeKey === scopeKey) {
            return {}
          }

          const speedHistory = state.historyByScope[scopeKey] ?? []
          return {
            scopeKey,
            historyByScope: state.historyByScope[scopeKey]
              ? state.historyByScope
              : {
                  ...state.historyByScope,
                  [scopeKey]: speedHistory,
                },
            speedHistory,
          }
        }),
      appendSpeedSample: (value, sampledAt, windowMs) =>
        set((state) => {
          if (!state.scopeKey) {
            return {}
          }

          const currentHistory = state.historyByScope[state.scopeKey] ?? []
          const nextHistory = [
            ...currentHistory.filter((sample) => sampledAt - sample.at <= windowMs),
            { at: sampledAt, value },
          ]

          return {
            historyByScope: {
              ...state.historyByScope,
              [state.scopeKey]: nextHistory,
            },
            speedHistory: nextHistory,
          }
        }),
      setMemStats: (memStats) => set({ memStats }),
    }),
    {
      name: "yard-overview",
      partialize: (state) => ({
        historyByScope: state.historyByScope,
        scopeKey: state.scopeKey,
        speedHistory: state.speedHistory,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return
        }

        state.historyByScope ??= {}
        Object.keys(state.historyByScope).forEach((scopeKey) => {
          const history = state.historyByScope[scopeKey]
          if (!Array.isArray(history)) {
            state.historyByScope[scopeKey] = []
            return
          }

          state.historyByScope[scopeKey] = history
            .filter((sample): sample is ThroughputSample => {
              return (
                Boolean(sample) &&
                typeof sample === "object" &&
                typeof sample.at === "number" &&
                typeof sample.value === "number"
              )
            })
            .sort((left, right) => left.at - right.at)
        })

        if (state.scopeKey) {
          state.speedHistory = state.historyByScope[state.scopeKey] ?? []
        } else {
          state.speedHistory = []
        }
      },
    },
  ),
)

export { useOverviewStore }
export type { ThroughputSample }
