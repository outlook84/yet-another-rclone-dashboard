export type AuthMode = "basic" | "bearer" | "cookie-session" | "none"

export interface AuthStrategy {
  mode: AuthMode
  apply(init: RequestInit): Promise<RequestInit>
  clear?(): Promise<void>
}

export interface BasicCredentials {
  username: string
  password: string
}
