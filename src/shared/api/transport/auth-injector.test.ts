// @vitest-environment jsdom

import { describe, expect, it } from "vitest"
import { BasicAuthStrategy, NoAuthStrategy } from "@/shared/api/transport/auth-injector"

describe("auth-injector", () => {
  it("leaves request init unchanged for no auth", async () => {
    const strategy = new NoAuthStrategy()
    const init = { method: "POST", headers: { Accept: "application/json" } }

    await expect(strategy.apply(init)).resolves.toEqual(init)
  })

  it("adds a basic authorization header while preserving existing headers", async () => {
    const strategy = new BasicAuthStrategy({
      username: "gui",
      password: "secret",
    })

    await expect(
      strategy.apply({
        headers: {
          Accept: "application/json",
        },
      }),
    ).resolves.toEqual({
      headers: {
        Accept: "application/json",
        Authorization: "Basic Z3VpOnNlY3JldA==",
      },
    })
  })
})
