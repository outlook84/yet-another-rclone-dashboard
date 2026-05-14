import { create } from "zustand"

type PastTransferGroupState = {
  expandedByScope: Record<string, string[]>
  seenByScope: Record<string, string[]>
  markSeenAndExpanded: (scope: string, keys: string[]) => void
  toggleExpanded: (scope: string, key: string) => void
}

const usePastTransferGroupsStore = create<PastTransferGroupState>((set) => ({
  expandedByScope: {},
  seenByScope: {},
  markSeenAndExpanded: (scope, keys) => {
    if (keys.length === 0) {
      return
    }

    set((state) => {
      const seen = new Set(state.seenByScope[scope] ?? [])
      const expanded = new Set(state.expandedByScope[scope] ?? [])

      for (const key of keys) {
        seen.add(key)
        expanded.add(key)
      }

      return {
        expandedByScope: {
          ...state.expandedByScope,
          [scope]: Array.from(expanded),
        },
        seenByScope: {
          ...state.seenByScope,
          [scope]: Array.from(seen),
        },
      }
    })
  },
  toggleExpanded: (scope, key) => {
    set((state) => {
      const expanded = new Set(state.expandedByScope[scope] ?? [])
      if (expanded.has(key)) {
        expanded.delete(key)
      } else {
        expanded.add(key)
      }

      return {
        expandedByScope: {
          ...state.expandedByScope,
          [scope]: Array.from(expanded),
        },
      }
    })
  },
}))

export { usePastTransferGroupsStore }
