import { createRcloneRcAppApiClient } from "@/shared/api/client/app-api-client"
import type { AuthMode, BasicCredentials } from "@/shared/api/contracts/auth"

async function validateConnection(input: {
  baseUrl: string
  authMode: AuthMode
  basicCredentials: BasicCredentials
}) {
  const client = createRcloneRcAppApiClient({
    baseUrl: input.baseUrl,
    authMode: input.authMode,
    basicCredentials: input.basicCredentials,
  })

  const [ping, serverInfo] = await Promise.all([
    client.session.ping(),
    client.session.getServerInfo(),
  ])

  return {
    ping,
    serverInfo,
    authMode: input.authMode,
  }
}

async function validateConnectionAndDetectAuthMode(input: {
  baseUrl: string
  authMode: AuthMode
  basicCredentials: BasicCredentials
}) {
  if (input.authMode !== "basic") {
    return validateConnection(input)
  }

  try {
    return await validateConnection({
      ...input,
      authMode: "none",
    })
  } catch {
    return validateConnection(input)
  }
}

export { validateConnection }
export { validateConnectionAndDetectAuthMode }
