// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"
import { appQueryClient } from "@/app/providers/app-query-client"
import { startManagedUpload } from "@/features/uploads/lib/upload-manager"
import { useUploadCenterStore } from "@/features/uploads/store/upload-center-store"
import { useConnectionStore } from "@/shared/store/connection-store"

class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = []

  upload: { onprogress: ((event: ProgressEvent<EventTarget>) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  status = 200
  statusText = "OK"
  responseText = ""
  method = ""
  url = ""
  headers = new Map<string, string>()
  body: FormData | null = null
  withCredentials = false

  constructor() {
    MockXMLHttpRequest.instances.push(this)
  }

  open(method: string, url: string) {
    this.method = method
    this.url = url
  }

  setRequestHeader(name: string, value: string) {
    this.headers.set(name, value)
  }

  abort() {
    this.onabort?.()
  }

  send(body: Document | XMLHttpRequestBodyInit | null | undefined) {
    this.body = body as FormData
    const fileEntry = this.body.get("file0") ?? this.body.get("file1")
    const size = fileEntry instanceof File ? fileEntry.size : 0

    if (size > 0) {
      this.upload.onprogress?.({
        lengthComputable: true,
        loaded: size / 2,
      } as ProgressEvent<EventTarget>)
      this.upload.onprogress?.({
        lengthComputable: true,
        loaded: size,
      } as ProgressEvent<EventTarget>)
    }

    this.onload?.()
  }
}

function getHeader(xhr: MockXMLHttpRequest, name: string) {
  const targetName = name.toLowerCase()
  const match = [...xhr.headers.entries()].find(([headerName]) => headerName.toLowerCase() === targetName)
  return match?.[1]
}

describe("startManagedUpload", () => {
  beforeEach(() => {
    MockXMLHttpRequest.instances = []
    vi.restoreAllMocks()
    vi.stubGlobal("XMLHttpRequest", MockXMLHttpRequest)
    useUploadCenterStore.setState({ tasks: [], collapsed: false })
    useConnectionStore.setState({
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      basicCredentials: {
        username: "gui",
        password: "secret",
      },
      lastValidatedAt: null,
      lastServerInfo: {
        product: "rclone",
        version: "v1.72.0",
        apiBaseUrl: "http://localhost:5572",
      },
      validationRevision: 0,
    })
  })

  it("uses indexed multipart field names and basic auth in the runtime uploader", async () => {
    const invalidateSpy = vi
      .spyOn(appQueryClient, "invalidateQueries")
      .mockResolvedValue(undefined as never)

    await startManagedUpload({
      remote: "demo",
      path: "folder",
      files: [
        new File(["hello"], "first.txt", { type: "text/plain" }),
        new File(["world"], "second.txt", { type: "text/plain" }),
      ],
    })

    expect(MockXMLHttpRequest.instances).toHaveLength(2)
    expect(MockXMLHttpRequest.instances[0]?.body?.get("file0")).toBeInstanceOf(File)
    expect(MockXMLHttpRequest.instances[0]?.body?.get("file")).toBeNull()
    expect((MockXMLHttpRequest.instances[0]?.body?.get("file0") as File).name).toBe("first.txt")
    expect(getHeader(MockXMLHttpRequest.instances[0]!, "Authorization")).toBe(
      `Basic ${btoa("gui:secret")}`,
    )
    expect(MockXMLHttpRequest.instances[1]?.body?.get("file1")).toBeInstanceOf(File)
    expect((MockXMLHttpRequest.instances[1]?.body?.get("file1") as File).name).toBe("second.txt")
    expect(getHeader(MockXMLHttpRequest.instances[1]!, "Authorization")).toBe(
      `Basic ${btoa("gui:secret")}`,
    )

    const task = useUploadCenterStore.getState().tasks[0]
    expect(task?.status).toBe("success")
    expect(invalidateSpy).toHaveBeenCalled()
  })

  it("does not send an authorization header for unauthenticated uploads", async () => {
    useConnectionStore.setState({
      authMode: "none",
      basicCredentials: {
        username: "",
        password: "",
      },
    })

    await startManagedUpload({
      remote: "demo",
      path: "folder",
      files: [new File(["hello"], "first.txt", { type: "text/plain" })],
    })

    expect(MockXMLHttpRequest.instances).toHaveLength(1)
    expect(getHeader(MockXMLHttpRequest.instances[0]!, "Authorization")).toBeUndefined()
    expect(MockXMLHttpRequest.instances[0]?.body?.get("file0")).toBeInstanceOf(File)
  })
})
