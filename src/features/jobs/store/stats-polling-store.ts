import { create } from "zustand"
import { persist } from "zustand/middleware"

interface StatsPollingState {
  intervalMs: number
  setIntervalMs: (intervalMs: number) => void
}

const useStatsPollingStore = create<StatsPollingState>()(
  persist(
    (set) => ({
      intervalMs: 5000,
      setIntervalMs: (intervalMs) => set({ intervalMs }),
    }),
    {
      name: "yard-stats-polling",
    },
  ),
)

export { useStatsPollingStore }
