import { beforeEach, describe, expect, it } from "vitest"
import { usePageChromeStore } from "@/shared/store/page-chrome-store"

describe("usePageChromeStore", () => {
  beforeEach(() => {
    usePageChromeStore.setState({
      headerContent: null,
    })
  })

  it("updates and clears header content", () => {
    usePageChromeStore.getState().setHeaderContent("Explorer")
    expect(usePageChromeStore.getState().headerContent).toBe("Explorer")

    usePageChromeStore.getState().setHeaderContent(null)
    expect(usePageChromeStore.getState().headerContent).toBeNull()
  })
})
