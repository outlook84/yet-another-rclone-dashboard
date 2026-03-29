import { Loader2, Save, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createRcloneRcAppApiClient } from "@/shared/api/client/app-api-client"
import { useExplorerUIStore } from "@/features/explorer/store/explorer-ui-store"
import { useOverviewStore } from "@/features/overview/store/overview-store"
import { PageShell } from "@/shared/components/page-shell"
import { useNotify } from "@/shared/components/notification-provider"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Input } from "@/shared/components/ui/input"
import { NativeSelect } from "@/shared/components/ui/native-select"
import { useConfirm } from "@/shared/components/confirm-provider"
import { useI18n } from "@/shared/i18n"
import { inputExamples, resolveInputExample } from "@/shared/i18n/input-examples"
import { toErrorMessage } from "@/shared/lib/error-utils"
import { cn } from "@/shared/lib/cn"
import { queryKeys } from "@/shared/lib/query-keys"
import { createProfileName, useSavedConnectionsStore } from "@/features/auth/store/saved-connections-store"
import { buildConnectionScope, useConnectionScope } from "@/shared/hooks/use-connection-scope"
import type { AuthMode } from "@/shared/api/contracts/auth"
import { useConnectionStore } from "@/shared/store/connection-store"

async function validateConnectionWithMode(input: {
  baseUrl: string
  authMode: AuthMode
  basicCredentials: { username: string; password: string }
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
  basicCredentials: { username: string; password: string }
}) {
  if (input.authMode === "basic") {
    try {
      return await validateConnectionWithMode({
        ...input,
        authMode: "none",
      })
    } catch {
      return validateConnectionWithMode(input)
    }
  }

  return validateConnectionWithMode(input)
}

function ConnectPage() {
  const { locale, messages } = useI18n()
  const {
    baseUrl,
    authMode,
    basicCredentials,
    applyConnection,
    setBaseUrl,
    setAuthMode,
    setBasicCredentials,
    markValidated,
  } = useConnectionStore()
  const profiles = useSavedConnectionsStore((state) => state.profiles)
  const selectedProfileId = useSavedConnectionsStore((state) => state.selectedProfileId)
  const saveProfile = useSavedConnectionsStore((state) => state.saveProfile)
  const selectProfile = useSavedConnectionsStore((state) => state.selectProfile)
  const deleteProfile = useSavedConnectionsStore((state) => state.deleteProfile)
  const notify = useNotify()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()
  const clearAllMediaPreviews = useExplorerUIStore((state) => state.clearAllMediaPreviews)
  const setOverviewMemStats = useOverviewStore((state) => state.setMemStats)
  const [syncEnabledDraftState, setSyncEnabledDraftState] = useState<{
    profileId: string | null
    value: boolean
  }>({
    profileId: null,
    value: false,
  })
  const [uploadEnabledDraftState, setUploadEnabledDraftState] = useState<{
    profileId: string | null
    value: boolean
  }>({
    profileId: null,
    value: false,
  })
  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  )
  const syncEnabledDraft =
    syncEnabledDraftState.profileId === (selectedProfile?.id ?? null)
      ? syncEnabledDraftState.value
      : (selectedProfile?.syncEnabled ?? false)
  const uploadEnabledDraft =
    uploadEnabledDraftState.profileId === (selectedProfile?.id ?? null)
      ? uploadEnabledDraftState.value
      : (selectedProfile?.uploadEnabled ?? false)

  const validateConnection = useMutation({
    mutationFn: async (params?: { baseUrl: string; authMode: string; basicCredentials?: typeof basicCredentials }) => {
      const targetBaseUrl = params?.baseUrl ?? baseUrl
      const targetAuthMode = (params?.authMode ?? authMode) as AuthMode
      const targetBasicCredentials = params?.basicCredentials ?? basicCredentials

      return validateConnectionAndDetectAuthMode({
        baseUrl: targetBaseUrl,
        authMode: targetAuthMode,
        basicCredentials: targetBasicCredentials,
      })
    },
    onSuccess: (result, params) => {
      const nextBaseUrl = params?.baseUrl ?? baseUrl
      const nextAuthMode = result.authMode
      const nextBasicCredentials = params?.basicCredentials ?? basicCredentials
      const nextScope = buildConnectionScope({
        baseUrl: nextBaseUrl,
        authMode: nextAuthMode,
        username: nextBasicCredentials.username,
        apiBaseUrl: result.serverInfo.apiBaseUrl,
      })

      for (const scope of new Set([connectionScope, nextScope])) {
        queryClient.removeQueries({
          queryKey: queryKeys.scope(scope),
        })
      }
      queryClient.removeQueries({
        queryKey: ["connection-health"],
      })
      clearAllMediaPreviews()
      setOverviewMemStats(null)
      if (selectedProfile) {
        const previousGeneratedName = createProfileName(
          selectedProfile.baseUrl,
          selectedProfile.authMode,
          selectedProfile.basicCredentials.username,
        )
        const shouldRegenerateName = selectedProfile.name === previousGeneratedName
        saveProfile({
          id: selectedProfile.id,
          name: shouldRegenerateName
            ? createProfileName(nextBaseUrl, nextAuthMode, nextBasicCredentials.username)
            : selectedProfile.name,
          baseUrl: nextBaseUrl,
          authMode: nextAuthMode,
          basicCredentials: nextBasicCredentials,
          syncEnabled: syncEnabledDraft,
          uploadEnabled: uploadEnabledDraft,
        })
      }
      applyConnection({
        baseUrl: nextBaseUrl,
        authMode: nextAuthMode,
        basicCredentials: nextBasicCredentials,
      })
      markValidated(result.serverInfo)
    },
    onError: (error) => {
      void error
    },
  })

  const handleApplySavedConnection = (profileId: string) => {
    if (!profileId) {
      selectProfile(null)
      return
    }

    const profile = profiles.find((item) => item.id === profileId)
    if (!profile) {
      return
    }

    selectProfile(profile.id)
    applyConnection({
      baseUrl: profile.baseUrl,
      authMode: profile.authMode,
      basicCredentials: profile.basicCredentials,
    })

    validateConnection.mutate({
      baseUrl: profile.baseUrl,
      authMode: profile.authMode,
      basicCredentials: profile.basicCredentials,
    })
  }

  const handleSaveCurrent = () => {
    const isChangingExisting =
      selectedProfile?.id &&
      selectedProfile.baseUrl === baseUrl &&
      selectedProfile.authMode === authMode &&
      (
        authMode !== "basic" ||
        selectedProfile.basicCredentials.username === basicCredentials.username
      )

    const name = isChangingExisting ? selectedProfile.name : ""

    saveProfile({
      id: isChangingExisting ? selectedProfile.id : undefined,
      name,
      baseUrl,
      authMode,
      basicCredentials,
      syncEnabled: syncEnabledDraft,
      uploadEnabled: uploadEnabledDraft,
    })

    notify({
      color: "green",
      title: messages.connect.connectionSaved(),
      message: messages.connect.connectionSavedMessage(),
    })
  }

  const handleDeleteSelected = () => {
    if (!selectedProfile) {
      return
    }

    deleteProfile(selectedProfile.id)
    notify({
      color: "green",
      title: messages.connect.savedConnectionRemoved(),
      message: messages.connect.savedConnectionRemovedMessage(selectedProfile.name),
    })
  }

  return (
    <PageShell title={messages.connect.title()} hideBadge hideHeader bareContent contentStyle={{ paddingTop: 4 }}>
      <div className="max-w-[560px]">
        <Card className="app-surface-muted">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4">
              <div className="app-section-title">{messages.connect.endpointSetup()}</div>

              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                <label className="flex flex-col gap-2">
                  <span className="app-field-label">{messages.connect.savedConnections()}</span>
                  <NativeSelect
                    value={selectedProfileId ?? ""}
                    onChange={(event) => handleApplySavedConnection(event.currentTarget.value)}
                  >
                    <option value="">{messages.connect.currentUnsavedConnection()}</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <Button type="button" variant="secondary" className="gap-1.5" onClick={handleSaveCurrent}>
                  <Save className="h-3.5 w-3.5" />
                  {messages.connect.saveCurrent()}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("shrink-0", !selectedProfile && "pointer-events-none opacity-40")}
                  onClick={handleDeleteSelected}
                  aria-label={messages.connect.deleteSavedConnection()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <label className="flex flex-col gap-2">
                <span className="app-field-label">{messages.connect.baseUrl()}</span>
                <Input
                  placeholder={resolveInputExample(inputExamples.rcBaseUrl, locale)}
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.currentTarget.value)}
                />
                <span className="app-help-text">{messages.connect.baseUrlDescription()}</span>
              </label>

              <label className="flex flex-col gap-2">
                <span className="app-field-label">{messages.connect.authMode()}</span>
                <NativeSelect
                  value={authMode}
                  onChange={(event) => {
                    const value = event.currentTarget.value
                    if (value === "basic" || value === "none") {
                      setAuthMode(value)
                    }
                  }}
                >
                  <option value="basic">{messages.connect.authBasic()}</option>
                  <option value="none">{messages.connect.authNone()}</option>
                </NativeSelect>
                <span className="app-help-text">{messages.connect.authModeDescription()}</span>
              </label>

              {authMode === "basic" ? (
                <>
                  <label className="flex flex-col gap-2">
                    <span className="app-field-label">{messages.connect.username()}</span>
                    <Input
                      value={basicCredentials.username}
                      onChange={(event) =>
                        setBasicCredentials({
                          ...basicCredentials,
                          username: event.currentTarget.value,
                        })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="app-field-label">{messages.connect.password()}</span>
                    <Input
                      type="password"
                      value={basicCredentials.password}
                      onChange={(event) =>
                        setBasicCredentials({
                          ...basicCredentials,
                          password: event.currentTarget.value,
                        })
                      }
                    />
                  </label>
                </>
              ) : null}

              <label className="flex items-start gap-3 rounded-[12px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-3 py-3">
                <Checkbox
                  aria-label={messages.connect.syncEnabled()}
                  checked={syncEnabledDraft}
                  onChange={async (event) => {
                    const nextChecked = event.currentTarget.checked
                    if (nextChecked && !syncEnabledDraft) {
                      const confirmed = await confirm({
                        title: messages.connect.syncRiskTitle(),
                        message: messages.connect.syncRiskMessage(),
                        confirmLabel: messages.common.confirm(),
                      })

                      if (!confirmed) {
                        return
                      }
                    }

                    setSyncEnabledDraftState({
                      profileId: selectedProfile?.id ?? null,
                      value: nextChecked,
                    })
                  }}
                />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[13px] font-bold text-[color:var(--app-text)]">{messages.connect.syncEnabled()}</span>
                  <span className="app-help-text">{messages.connect.syncEnabledDescription()}</span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-[12px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-3 py-3">
                <Checkbox
                  aria-label={messages.connect.uploadEnabled()}
                  checked={uploadEnabledDraft}
                  onChange={async (event) => {
                    const nextChecked = event.currentTarget.checked
                    if (nextChecked && !uploadEnabledDraft) {
                      const confirmed = await confirm({
                        title: messages.connect.uploadRiskTitle(),
                        message: messages.connect.uploadRiskMessage(),
                        confirmLabel: messages.common.confirm(),
                      })

                      if (!confirmed) {
                        return
                      }
                    }

                    setUploadEnabledDraftState({
                      profileId: selectedProfile?.id ?? null,
                      value: nextChecked,
                    })
                  }}
                />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[13px] font-bold text-[color:var(--app-text)]">{messages.connect.uploadEnabled()}</span>
                  <span className="app-help-text">{messages.connect.uploadEnabledDescription()}</span>
                </span>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button disabled={validateConnection.isPending} onClick={() => validateConnection.mutate(undefined)}>
                  {validateConnection.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  {messages.connect.validateConnection()}
                </Button>
              </div>
              {validateConnection.data ? (
                <Alert variant="success">
                  <AlertTitle>{messages.connect.connectionReady()}</AlertTitle>
                  <AlertDescription>
                    {messages.connect.connectionReadyMessage(
                      validateConnection.data.serverInfo.product,
                      Math.round(validateConnection.data.ping.latencyMs ?? 0),
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}
              {validateConnection.isError ? (
                <Alert variant="warning">
                  <AlertTitle>{messages.connect.connectionFailed()}</AlertTitle>
                  <AlertDescription>
                    {toErrorMessage(validateConnection.error, messages.common)}
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}

export { ConnectPage }
