export interface RuntimeSettings {
  logLevel: string
  bandwidthLimit: string
  transfers: number
  checkers: number
  timeout: string
  connectTimeout: string
  retries: number
  lowLevelRetries: number
}

export interface RuntimeSettingsApi {
  get(): Promise<RuntimeSettings>
  update(input: Partial<RuntimeSettings>): Promise<void>
}
