// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MountsPage } from "@/features/mounts/pages/mounts-page"
import { renderWithProviders } from "@/test/render-with-providers"

const mountsQueryMock = vi.fn()
const createMountMutationMock = vi.fn()
const unmountMutationMock = vi.fn()
const unmountAllMutationMock = vi.fn()

vi.mock("@/features/mounts/api/use-mounts-query", () => ({
  useMountsQuery: () => mountsQueryMock(),
}))

vi.mock("@/features/mounts/api/use-unmount-mutation", () => ({
  useUnmountMutation: () => unmountMutationMock(),
}))

vi.mock("@/features/mounts/api/use-create-mount-mutation", () => ({
  useCreateMountMutation: () => createMountMutationMock(),
}))

vi.mock("@/features/mounts/api/use-unmount-all-mutation", () => ({
  useUnmountAllMutation: () => unmountAllMutationMock(),
}))

describe("MountsPage", () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    mountsQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: [
        {
          mountPoint: "/mnt/demo",
          fs: "demo:",
          mountType: "mount",
        },
      ],
    })

    unmountMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync: vi.fn(),
    })

    createMountMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync: vi.fn(),
    })

    unmountAllMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync: vi.fn(),
    })
  })

  it("does not unmount when confirmation is rejected", async () => {
    const mutateAsync = vi.fn()
    unmountMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync,
    })

    renderWithProviders(<MountsPage />)
    fireEvent.click(screen.getByRole("button", { name: "Unmount" }))
    const dialog = await screen.findByRole("dialog")

    expect(
      within(dialog).getByText('Unmount "/mnt/demo"? This affects the running rclone backend.'),
    ).not.toBeNull()

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))

    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it("creates a mount from the inline form", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    createMountMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync,
    })

    renderWithProviders(<MountsPage />)

    fireEvent.change(screen.getByLabelText("FS"), {
      target: { value: "demo:" },
    })
    fireEvent.change(screen.getByLabelText("Mount Point"), {
      target: { value: "/mnt/demo" },
    })
    fireEvent.change(screen.getByLabelText("Mount Type"), {
      target: { value: "mount" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create Mount" }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        fs: "demo:",
        mountPoint: "/mnt/demo",
        mountType: "mount",
      })
    })
  })

  it("unmounts after confirmation", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    unmountMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync,
    })

    renderWithProviders(<MountsPage />)
    fireEvent.click(screen.getByRole("button", { name: "Unmount" }))
    const dialog = await screen.findByRole("dialog")

    fireEvent.click(within(dialog).getByRole("button", { name: "Unmount" }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith("/mnt/demo")
    })
  })
})
