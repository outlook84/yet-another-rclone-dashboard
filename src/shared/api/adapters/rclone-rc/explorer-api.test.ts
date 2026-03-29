import { describe, expect, it, vi } from "vitest"
import { RcloneRcExplorerApi } from "@/shared/api/adapters/rclone-rc/explorer-api"
import type { ApiTransport, TransportRequest } from "@/shared/api/transport/api-transport"

function createTransport(
  handler: (input: TransportRequest) => Promise<unknown>,
): ApiTransport {
  return {
    request: vi.fn((input: TransportRequest) => handler(input)) as ApiTransport["request"],
  }
}

describe("RcloneRcExplorerApi", () => {
  it("maps list and stat responses into explorer items", async () => {
    const transport = createTransport(async (input) => {
      if (input.path === "operations/list") {
        return {
          list: [
            {
              Path: "docs/readme.md",
              Name: "readme.md",
              Size: 42,
              ModTime: "2026-03-28T09:00:00.000Z",
              MimeType: "text/markdown",
              Hashes: { md5: "abc" },
            },
            {
              Path: "photos",
              IsDir: true,
              IsBucket: true,
            },
          ],
        }
      }

      if (input.path === "operations/stat") {
        return {
          item: {
            Path: "docs/readme.md",
            Size: 42,
          },
        }
      }

      throw new Error(`unexpected path: ${input.path}`)
    })

    const api = new RcloneRcExplorerApi(transport)
    await expect(
      api.list({ remote: "demo", path: "docs" }, { recurse: true }),
    ).resolves.toEqual({
      location: { remote: "demo", path: "docs" },
      items: [
        {
          path: "docs/readme.md",
          name: "readme.md",
          type: "file",
          size: 42,
          modTime: "2026-03-28T09:00:00.000Z",
          mimeType: "text/markdown",
          hashes: { md5: "abc" },
          isBucket: undefined,
        },
        {
          path: "photos",
          name: "photos",
          type: "dir",
          size: undefined,
          modTime: undefined,
          mimeType: undefined,
          hashes: undefined,
          isBucket: true,
        },
      ],
    })

    await expect(
      api.stat({ remote: "demo", path: "docs/readme.md" }),
    ).resolves.toEqual({
      item: {
        path: "docs/readme.md",
        name: "docs/readme.md",
        type: "file",
        size: 42,
        modTime: undefined,
        mimeType: undefined,
        hashes: undefined,
        isBucket: undefined,
      },
    })
  })

  it("maps fs info, usage, and async job handles", async () => {
    const transport = createTransport(async (input) => {
      if (input.path === "operations/fsinfo") {
        return {
          Features: { PublicLink: true },
          Hashes: ["md5", "sha1"],
        }
      }

      if (input.path === "operations/about") {
        return {
          total: 1000,
          used: 300,
          free: 700,
          objects: 12,
        }
      }

      if (input.path === "operations/cleanup") {
        return { jobid: 99 }
      }

      if (input.path === "operations/copyfile") {
        return { jobid: "copy-1" }
      }

      if (input.path === "sync/move") {
        return {}
      }

      throw new Error(`unexpected path: ${input.path}`)
    })

    const api = new RcloneRcExplorerApi(transport)

    await expect(api.getFsInfo({ remote: "demo", path: "" })).resolves.toEqual({
      features: { PublicLink: true },
      hashes: ["md5", "sha1"],
    })
    await expect(api.getUsage({ remote: "demo", path: "" })).resolves.toEqual({
      total: 1000,
      used: 300,
      trashed: undefined,
      other: undefined,
      free: 700,
      objects: 12,
    })
    await expect(api.cleanup({ remote: "demo", path: "" })).resolves.toEqual({ jobId: 99 })
    await expect(
      api.copyFile({
        src: { remote: "a", path: "x.txt" },
        dst: { remote: "b", path: "y.txt" },
      }),
    ).resolves.toEqual({ jobId: "copy-1" })
    await expect(
      api.moveDir({
        src: { remote: "a", path: "src" },
        dst: { remote: "b", path: "dst" },
      }),
    ).resolves.toBeUndefined()
  })

  it("throws when public link succeeds without a url", async () => {
    const transport = createTransport(async (input) => {
      if (input.path === "operations/publiclink") {
        return {}
      }

      throw new Error(`unexpected path: ${input.path}`)
    })

    const api = new RcloneRcExplorerApi(transport)

    await expect(
      api.publicLink({ remote: "demo", path: "docs/readme.md" }),
    ).rejects.toThrow("did not return a url")
  })

  it("uploads files with multipart form data to operations/uploadfile", async () => {
    const transport = createTransport(async (input) => {
      expect(input.method).toBe("POST")
      expect(input.path).toBe("operations/uploadfile?fs=demo%3A&remote=folder%2Fnested")
      expect(input.timeoutMs).toBeNull()
      expect(input.body).toBeInstanceOf(FormData)

      const body = input.body as FormData
      expect(body.get("file0")).toBeInstanceOf(File)
      expect((body.get("file0") as File).name).toBe("demo.txt")

      return undefined
    })

    const api = new RcloneRcExplorerApi(transport)

    await expect(
      api.uploadFiles({
        dst: { remote: "demo", path: "folder/nested" },
        files: [new File(["hello"], "demo.txt", { type: "text/plain" })],
      }),
    ).resolves.toBeUndefined()
  })
})
