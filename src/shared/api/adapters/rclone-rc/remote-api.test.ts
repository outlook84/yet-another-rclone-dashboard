import { describe, expect, it, vi } from "vitest"
import { RcloneRcRemoteApi } from "@/shared/api/adapters/rclone-rc/remote-api"
import type { ApiTransport, TransportRequest } from "@/shared/api/transport/api-transport"

function createTransport(
  handler: (input: TransportRequest) => Promise<unknown>,
): ApiTransport {
  return {
    request: vi.fn((input: TransportRequest) => handler(input)) as ApiTransport["request"],
  }
}

describe("RcloneRcRemoteApi", () => {
  it("lists only object remotes and sorts them by name", async () => {
    const transport = createTransport(async (input) => {
      if (input.path === "config/dump") {
        return {
          zeta: { type: "s3" },
          alpha: { type: "drive" },
          ignored: ["not-a-remote"],
          nil: null,
        }
      }

      throw new Error(`unexpected path: ${input.path}`)
    })

    const api = new RcloneRcRemoteApi(transport)

    await expect(api.list()).resolves.toEqual([
      { name: "alpha", backend: "drive", status: "ready" },
      { name: "zeta", backend: "s3", status: "ready" },
    ])
    await expect(api.dump()).resolves.toEqual({
      zeta: { type: "s3" },
      alpha: { type: "drive" },
    })
  })

  it("creates and updates remotes through the expected payload shape", async () => {
    const transport = createTransport(async (input) => {
      if (input.path === "config/create") {
        expect(input.body).toEqual({
          name: "demo",
          type: "s3",
          parameters: {
            provider: "AWS",
          },
        })
        return {}
      }

      if (input.path === "config/update") {
        expect(input.body).toEqual({
          name: "demo",
          parameters: {
            provider: "MinIO",
          },
        })
        return {}
      }

      if (input.path === "config/get") {
        return {
          type: "s3",
          provider: "MinIO",
        }
      }

      throw new Error(`unexpected path: ${input.path}`)
    })

    const api = new RcloneRcRemoteApi(transport)

    await expect(
      api.create({
        name: "demo",
        config: {
          type: "s3",
          provider: "AWS",
        },
      }),
    ).resolves.toEqual({
      name: "demo",
      backend: "s3",
      config: {
        type: "s3",
        provider: "MinIO",
      },
      source: "rclone-rc",
    })

    await expect(
      api.update({
        name: "demo",
        config: {
          provider: "MinIO",
        },
      }),
    ).resolves.toEqual({
      name: "demo",
      backend: "s3",
      config: {
        type: "s3",
        provider: "MinIO",
      },
      source: "rclone-rc",
    })
  })

  it("rejects create input without a string type", async () => {
    const transport = createTransport(async () => ({}))
    const api = new RcloneRcRemoteApi(transport)

    await expect(
      api.create({
        name: "broken",
        config: {},
      }),
    ).rejects.toThrow('include a string "type" field')
  })

  it("rejects create input with an invalid remote name", async () => {
    const transport = createTransport(async () => ({}))
    const api = new RcloneRcRemoteApi(transport)

    await expect(
      api.create({
        name: "-broken",
        config: {
          type: "s3",
        },
      }),
    ).rejects.toThrow("Remote name contains invalid characters")
  })
})
