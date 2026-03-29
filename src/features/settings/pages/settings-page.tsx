import { Loader2, RotateCcw } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import type { RuntimeSettings } from "@/shared/api/contracts/settings"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { useNotify } from "@/shared/components/notification-provider"
import { PageShell } from "@/shared/components/page-shell"
import { QueryErrorAlert } from "@/shared/components/query-error-alert"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { NativeSelect } from "@/shared/components/ui/native-select"
import { useI18n } from "@/shared/i18n"
import { formatInputExamples, inputExamples } from "@/shared/i18n/input-examples"
import { toErrorMessage } from "@/shared/lib/error-utils"
import { queryKeys } from "@/shared/lib/query-keys"

type ScopedDraft = {
  scope: string
  value: RuntimeSettings
}

type SaveSettingsInput = {
  scope: string
  nextSettings: RuntimeSettings
}

function normalizeSettings(input: RuntimeSettings): RuntimeSettings {
  return {
    ...input,
    bandwidthLimit: input.bandwidthLimit.trim(),
  }
}

function diffRuntimeSettings(current: RuntimeSettings, next: RuntimeSettings): Partial<RuntimeSettings> {
  const normalizedCurrent = normalizeSettings(current)
  const normalizedNext = normalizeSettings(next)
  const changed: Partial<RuntimeSettings> = {}
  const keys: Array<keyof RuntimeSettings> = [
    "logLevel",
    "bandwidthLimit",
    "transfers",
    "checkers",
    "timeout",
    "connectTimeout",
    "retries",
    "lowLevelRetries",
  ]

  for (const key of keys) {
    if (normalizedNext[key] !== normalizedCurrent[key]) {
      changed[key] = normalizedNext[key] as never
    }
  }

  return changed
}

function SettingsPage() {
  const { locale, messages } = useI18n()
  const api = useAppApi()
  const connectionScope = useConnectionScope()
  const notify = useNotify()
  const queryClient = useQueryClient()
  const [draftState, setDraftState] = useState<ScopedDraft | null>(null)
  const logLevelOptions = [
    { value: "ERROR", label: messages.settings.error() },
    { value: "WARNING", label: messages.settings.warning() },
    { value: "NOTICE", label: messages.settings.notice() },
    { value: "INFO", label: messages.settings.info() },
    { value: "DEBUG", label: messages.settings.debug() },
  ]

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings(connectionScope),
    queryFn: () => api.settings.get(),
  })
  const bandwidthLimitExamples = inputExamples.bandwidthLimit.map((example) => {
    const value = formatInputExamples([example], locale)
    return { value, label: value }
  })
  const bandwidthHint = formatInputExamples(inputExamples.bandwidthLimit, locale, { quoted: true })
  const timeoutHint = formatInputExamples(inputExamples.timeout, locale, { quoted: true })
  const connectTimeoutHint = formatInputExamples(inputExamples.connectTimeout, locale, { quoted: true })

  const scopedDraft = draftState?.scope === connectionScope ? draftState.value : null
  const draft = scopedDraft ?? settingsQuery.data ?? null

  const saveMutation = useMutation({
    mutationFn: async ({ nextSettings }: SaveSettingsInput) => {
      const baseline = settingsQuery.data
      const payload = baseline ? diffRuntimeSettings(baseline, nextSettings) : normalizeSettings(nextSettings)
      await api.settings.update(payload)
    },
    onSuccess: async (_, { scope, nextSettings }) => {
      queryClient.setQueryData(queryKeys.settings(scope), normalizeSettings(nextSettings))
      setDraftState((current) => (current?.scope === scope ? null : current))
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings(scope) })
      notify({
        color: "green",
        title: messages.settings.settingsSaved(),
        message: messages.settings.settingsSavedMessage(),
      })
    },
    onError: (error) => {
      notify({
        color: "red",
        title: messages.settings.saveFailed(),
        message: toErrorMessage(error, messages.common),
      })
    },
  })

  const isDirty =
    scopedDraft !== null &&
    settingsQuery.data !== undefined &&
    JSON.stringify(draft) !== JSON.stringify(settingsQuery.data)

  const resetDraft = () => {
    setDraftState(null)
  }

  const actionButtons = (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        disabled={!draft || saveMutation.isPending || !isDirty}
        onClick={resetDraft}
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        {messages.common.reset()}
      </Button>
      <Button
        disabled={!draft || !isDirty}
        onClick={() => {
          if (draft) {
            saveMutation.mutate({
              scope: connectionScope,
              nextSettings: normalizeSettings(draft),
            })
          }
        }}
      >
        {saveMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
        {messages.common.save()}
      </Button>
    </div>
  )

  return (
    <PageShell title={messages.settings.title()} hideBadge hideHeader bareContent contentStyle={{ paddingTop: 4 }}>
      <div className="flex flex-col gap-5">
        <Alert variant="warning" className="border-[color:var(--app-info-border)] bg-[color:var(--app-info-bg)] text-[color:var(--app-text)]">
          <AlertDescription>
            {messages.settings.runtimeWarning()}
          </AlertDescription>
        </Alert>

        {settingsQuery.error ? <QueryErrorAlert title={messages.settings.couldntLoadSettings()} error={settingsQuery.error} /> : null}

        <div className="flex items-center justify-end md:hidden">
          {actionButtons}
        </div>

        <Card className="app-surface-muted">
          <CardContent className="p-5">
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <div className="xl:col-span-3">
                  <div className="text-base font-normal leading-5 text-[color:var(--app-text)]">
                    {messages.settings.runtimeChangesImmediate()}
                  </div>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="app-field-label">{messages.settings.logLevel()}</span>
                  <NativeSelect
                    value={draft?.logLevel ?? ""}
                    onChange={(event) => {
                      if (draft) {
                        setDraftState({
                          scope: connectionScope,
                          value: { ...draft, logLevel: event.currentTarget.value },
                        })
                      }
                    }}
                    disabled={!draft || saveMutation.isPending}
                  >
                    {logLevelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </label>

                <div className="flex flex-col gap-2">
                  <span className="app-field-label">{messages.settings.bandwidthLimit()}</span>
                  <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-2">
                    <Input
                      value={draft?.bandwidthLimit ?? ""}
                      onChange={(event) => {
                        if (draft) {
                          setDraftState({
                            scope: connectionScope,
                            value: { ...draft, bandwidthLimit: event.currentTarget.value },
                          })
                        }
                      }}
                      disabled={!draft || saveMutation.isPending}
                    />
                    <NativeSelect
                      value=""
                      onChange={(event) => {
                        if (draft && event.currentTarget.value) {
                          setDraftState({
                            scope: connectionScope,
                            value: { ...draft, bandwidthLimit: event.currentTarget.value },
                          })
                        }
                      }}
                      disabled={!draft || saveMutation.isPending}
                    >
                      <option value="">{messages.settings.preset()}</option>
                      {bandwidthLimitExamples.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <span className="app-help-text">
                    {messages.settings.bandwidthExamples(bandwidthHint)}
                  </span>
                </div>

                <div className="xl:col-span-3 pt-1">
                  <div className="text-base font-normal leading-5 text-[color:var(--app-text)]">
                    {messages.settings.usedByNewTransfers()}
                  </div>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="app-field-label">{messages.settings.transfers()}</span>
                  <Input
                    type="number"
                    min={1}
                    value={draft?.transfers ?? ""}
                    onChange={(event) => {
                      if (draft) {
                        setDraftState({
                          scope: connectionScope,
                          value: { ...draft, transfers: Number(event.currentTarget.value) },
                        })
                      }
                    }}
                    disabled={!draft || saveMutation.isPending}
                  />
                  <span className="app-help-text">{messages.settings.transfersDescription()}</span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="app-field-label">{messages.settings.checkers()}</span>
                  <Input
                    type="number"
                    min={1}
                    value={draft?.checkers ?? ""}
                    onChange={(event) => {
                      if (draft) {
                        setDraftState({
                          scope: connectionScope,
                          value: { ...draft, checkers: Number(event.currentTarget.value) },
                        })
                      }
                    }}
                    disabled={!draft || saveMutation.isPending}
                  />
                  <span className="app-help-text">{messages.settings.checkersDescription()}</span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="app-field-label">{messages.settings.retries()}</span>
                  <Input
                    type="number"
                    min={1}
                    value={draft?.retries ?? ""}
                    onChange={(event) => {
                      if (draft) {
                        setDraftState({
                          scope: connectionScope,
                          value: { ...draft, retries: Number(event.currentTarget.value) },
                        })
                      }
                    }}
                    disabled={!draft || saveMutation.isPending}
                  />
                  <span className="app-help-text">{messages.settings.retriesDescription()}</span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="app-field-label">{messages.settings.lowLevelRetries()}</span>
                  <Input
                    type="number"
                    min={1}
                    value={draft?.lowLevelRetries ?? ""}
                    onChange={(event) => {
                      if (draft) {
                        setDraftState({
                          scope: connectionScope,
                          value: { ...draft, lowLevelRetries: Number(event.currentTarget.value) },
                        })
                      }
                    }}
                    disabled={!draft || saveMutation.isPending}
                  />
                  <span className="app-help-text">{messages.settings.lowLevelRetriesDescription()}</span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="app-field-label">{messages.settings.timeout()}</span>
                  <Input
                    value={draft?.timeout ?? ""}
                    onChange={(event) => {
                      if (draft) {
                        setDraftState({
                          scope: connectionScope,
                          value: { ...draft, timeout: event.currentTarget.value },
                        })
                      }
                    }}
                    disabled={!draft || saveMutation.isPending}
                  />
                  <span className="app-help-text">
                    {messages.settings.timeoutDescription(timeoutHint)}
                  </span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="app-field-label">{messages.settings.connectTimeout()}</span>
                  <Input
                    value={draft?.connectTimeout ?? ""}
                    onChange={(event) => {
                      if (draft) {
                        setDraftState({
                          scope: connectionScope,
                          value: { ...draft, connectTimeout: event.currentTarget.value },
                        })
                      }
                    }}
                    disabled={!draft || saveMutation.isPending}
                  />
                  <span className="app-help-text">
                    {messages.settings.connectTimeoutDescription(connectTimeoutHint)}
                  </span>
                </label>
              </div>

              <div className="hidden md:flex flex-wrap items-center justify-start gap-3 pt-3">
                {actionButtons}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}

export { SettingsPage }
