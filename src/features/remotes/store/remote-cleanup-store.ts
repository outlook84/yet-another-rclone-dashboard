import { create } from "zustand"
import { persist } from "zustand/middleware"

interface RemoteCleanupState {
  lastRunAtBySource: Record<string, string>
  markRun: (sourceKey: string, startedAt: string) => void
}

const useRemoteCleanupStore = create<RemoteCleanupState>()(
  persist(
    (set) => ({
      lastRunAtBySource: {},
      markRun: (sourceKey, startedAt) =>
        set((state) => ({
          lastRunAtBySource: {
            ...state.lastRunAtBySource,
            [sourceKey]: startedAt,
          },
        })),
    }),
    {
      name: "yard-remote-cleanup-cooldown",
    },
  ),
)

export { useRemoteCleanupStore }
