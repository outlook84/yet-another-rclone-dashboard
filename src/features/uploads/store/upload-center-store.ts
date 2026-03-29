import { create } from "zustand"

export type UploadTaskStatus = "uploading" | "success" | "error" | "cancelled"

export interface UploadTask {
  id: string
  remote: string
  path: string
  fileCount: number
  totalBytes: number
  uploadedBytes: number
  completedFiles: number
  currentFileName: string | null
  currentFileSize: number
  currentFileUploadedBytes: number
  fileNames: string[]
  status: UploadTaskStatus
  errorMessage: string | null
  startedAt: string
  lastProgressAt: string
  progressEventCount: number
  cancel?: () => void
}

interface UploadCenterState {
  tasks: UploadTask[]
  collapsed: boolean
  addTask: (task: UploadTask) => void
  updateTask: (id: string, updater: (task: UploadTask) => UploadTask) => void
  removeTask: (id: string) => void
  setCollapsed: (collapsed: boolean) => void
  collapse: () => void
  expand: () => void
  cancelTask: (id: string) => void
  clearCompletedTasks: () => void
}

const useUploadCenterStore = create<UploadCenterState>((set, get) => ({
  tasks: [],
  collapsed: false,
  addTask: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks],
      collapsed: false,
    })),
  updateTask: (id, updater) =>
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? updater(task) : task)),
    })),
  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    })),
  setCollapsed: (collapsed) => set({ collapsed }),
  collapse: () => set({ collapsed: true }),
  expand: () => set({ collapsed: false }),
  cancelTask: (id) => {
    const task = get().tasks.find((item) => item.id === id)
    task?.cancel?.()
  },
  clearCompletedTasks: () =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.status !== "success"),
    })),
}))

export { useUploadCenterStore }
