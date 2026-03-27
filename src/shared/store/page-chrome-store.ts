import type { ReactNode } from "react"
import { create } from "zustand"

interface PageChromeState {
  headerContent: ReactNode | null
  setHeaderContent: (content: ReactNode | null) => void
}

const usePageChromeStore = create<PageChromeState>((set) => ({
  headerContent: null,
  setHeaderContent: (headerContent) => set({ headerContent }),
}))

export { usePageChromeStore }
