import { appQueryClient } from "@/app/providers/app-query-client"
import { buildConnectionScope } from "@/shared/hooks/use-connection-scope"
import { createAuthStrategy, applyAuthStrategyToXhr } from "@/shared/api/transport/auth-injector"
import { queryKeys } from "@/shared/lib/query-keys"
import { useConnectionStore } from "@/shared/store/connection-store"
import { useUploadCenterStore, type UploadTask } from "@/features/uploads/store/upload-center-store"

function buildUploadTaskId() {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildUploadUrl(baseUrl: string, remote: string, path: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "")
  const params = new URLSearchParams({
    fs: `${remote}:`,
    remote: path,
  })
  return `${normalizedBaseUrl}/operations/uploadfile?${params.toString()}`
}

function uploadSingleFile(input: {
  url: string
  file: File
  fieldName: string
  authMode: ReturnType<typeof createAuthStrategy>
  onProgress: (loadedBytes: number) => void
  registerCancel: (cancel: () => void) => void
}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append(input.fieldName, input.file, input.file.name)

    input.registerCancel(() => xhr.abort())

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        input.onProgress(event.loaded)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        input.onProgress(input.file.size)
        resolve()
        return
      }

      let message = `${xhr.status} ${xhr.statusText}`.trim()
      if (xhr.responseText) {
        try {
          const data = JSON.parse(xhr.responseText) as { error?: unknown }
          if (typeof data.error === "string" && data.error.trim()) {
            message = data.error
          }
        } catch {
          message = xhr.responseText
        }
      }

      reject(new Error(message || "Upload failed"))
    }

    xhr.onerror = () => reject(new Error("Upload failed"))
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"))

    xhr.open("POST", input.url)

    void applyAuthStrategyToXhr(xhr, input.authMode)
      .then(() => {
        xhr.send(formData)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

async function startManagedUpload(input: {
  remote: string
  path: string
  files: File[]
}) {
  const connection = useConnectionStore.getState()
  const baseUrl = connection.lastServerInfo?.apiBaseUrl ?? connection.baseUrl
  const authStrategy = createAuthStrategy(connection.authMode, connection.basicCredentials)
  const connectionScope = buildConnectionScope({
    baseUrl: connection.baseUrl,
    authMode: connection.authMode,
    username: connection.basicCredentials.username,
    apiBaseUrl: connection.lastServerInfo?.apiBaseUrl,
  })
  const totalBytes = input.files.reduce((sum, file) => sum + file.size, 0)
  const id = buildUploadTaskId()
  const store = useUploadCenterStore.getState()

  const initialTask: UploadTask = {
    id,
    remote: input.remote,
    path: input.path,
    fileCount: input.files.length,
    totalBytes,
    uploadedBytes: 0,
    completedFiles: 0,
    currentFileName: input.files[0]?.name ?? null,
    currentFileSize: input.files[0]?.size ?? 0,
    currentFileUploadedBytes: 0,
    fileNames: input.files.map((file) => file.name),
    status: "uploading",
    errorMessage: null,
    startedAt: new Date().toISOString(),
    lastProgressAt: new Date().toISOString(),
    progressEventCount: 0,
  }

  store.addTask(initialTask)

  let cancelled = false
  let activeCancel: (() => void) | undefined

  store.updateTask(id, (task) => ({
    ...task,
    cancel: () => {
      cancelled = true
      activeCancel?.()
    },
  }))

  let completedBytes = 0
  let completedFiles = 0

  try {
    for (const [fileIndex, file] of input.files.entries()) {
      if (cancelled) {
        throw new DOMException("Upload aborted", "AbortError")
      }

      store.updateTask(id, (task) => ({
        ...task,
        currentFileName: file.name,
        currentFileSize: file.size,
        currentFileUploadedBytes: 0,
        uploadedBytes: completedBytes,
        lastProgressAt: new Date().toISOString(),
        progressEventCount: 0,
      }))

      await uploadSingleFile({
        url: buildUploadUrl(baseUrl, input.remote, input.path),
        file,
        fieldName: `file${fileIndex}`,
        authMode: authStrategy,
        registerCancel: (cancel) => {
          activeCancel = cancel
        },
        onProgress: (loadedBytes) => {
          const now = new Date().toISOString()
          useUploadCenterStore.getState().updateTask(id, (task) => ({
            ...task,
            currentFileUploadedBytes: loadedBytes,
            uploadedBytes: completedBytes + loadedBytes,
            lastProgressAt: now,
            progressEventCount: task.progressEventCount + 1,
          }))
        },
      })

      completedBytes += file.size
      completedFiles += 1

      store.updateTask(id, (task) => ({
        ...task,
        completedFiles,
        currentFileUploadedBytes: file.size,
        uploadedBytes: completedBytes,
        lastProgressAt: new Date().toISOString(),
      }))
    }

    store.updateTask(id, (task) => ({
      ...task,
      status: "success",
      completedFiles: input.files.length,
      uploadedBytes: totalBytes,
      currentFileName: null,
      currentFileSize: 0,
      currentFileUploadedBytes: 0,
      lastProgressAt: new Date().toISOString(),
      progressEventCount: task.progressEventCount,
      cancel: undefined,
    }))

    await Promise.all([
      appQueryClient.invalidateQueries({
        queryKey: queryKeys.explorer(connectionScope, input.remote, input.path),
      }),
      appQueryClient.invalidateQueries({
        queryKey: [...queryKeys.explorer(connectionScope, input.remote, ""), "usage"],
      }),
      appQueryClient.invalidateQueries({
        queryKey: queryKeys.stats(connectionScope),
      }),
      appQueryClient.invalidateQueries({
        queryKey: queryKeys.transferred(connectionScope),
      }),
    ])
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === "AbortError"
    store.updateTask(id, (task) => ({
      ...task,
      status: isAbort ? "cancelled" : "error",
      errorMessage: isAbort ? null : error instanceof Error ? error.message : "Upload failed",
      currentFileName: null,
      currentFileSize: 0,
      currentFileUploadedBytes: 0,
      lastProgressAt: new Date().toISOString(),
      progressEventCount: task.progressEventCount,
      cancel: undefined,
    }))
  }
}

export { startManagedUpload }
