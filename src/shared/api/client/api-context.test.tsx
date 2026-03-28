// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AppApiProvider, useAppApi } from "@/shared/api/client/api-context"
import { useConnectionStore } from "@/shared/store/connection-store"

const createRcloneRcAppApiClientMock = vi.fn()

vi.mock("@/shared/api/client/app-api-client", () => ({
  createRcloneRcAppApiClient: (input: unknown) => createRcloneRcAppApiClientMock(input),
}))

function Probe() {
  const api = useAppApi()
  return <div>{String((api as unknown as { marker: string }).marker)}</div>
}

describe("api-context", () => {
  beforeEach(() => {
    createRcloneRcAppApiClientMock.mockReset()
    useConnectionStore.setState({
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      basicCredentials: {
        username: "gui",
        password: "",
      },
      lastValidatedAt: null,
      lastServerInfo: null,
    })
  })

  it("throws when useAppApi is called outside the provider", () => {
    expect(() => render(<Probe />)).toThrow("AppApiProvider is missing")
  })

  it("creates a client from the current connection state", () => {
    createRcloneRcAppApiClientMock.mockReturnValue({
      marker: "client-1",
    })

    render(
      <AppApiProvider>
        <Probe />
      </AppApiProvider>,
    )

    expect(createRcloneRcAppApiClientMock).toHaveBeenCalledWith({
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      basicCredentials: {
        username: "gui",
        password: "",
      },
    })
    expect(screen.getByText("client-1")).toBeTruthy()
  })
})
