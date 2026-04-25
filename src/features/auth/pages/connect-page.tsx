import { Save, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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
import {
  createProfileName,
  useSavedConnectionsStore,
  type SavedConnectionProfile,
} from "@/features/auth/store/saved-connections-store"
import {
  areDraftSettingsEqual,
  toDraftFromConnection,
  toDraftFromProfile,
  type ConnectionDraft,
} from "@/features/auth/lib/connection-draft"
import { validateConnectionAndDetectAuthMode } from "@/features/auth/lib/validate-connection"
import { buildConnectionScope, useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { getDefaultBaseUrl, useConnectionStore } from "@/shared/store/connection-store"

function resolveSavedProfileName(profile: SavedConnectionProfile, draft: ConnectionDraft) {
  const previousGeneratedName = createProfileName(
    profile.baseUrl,
    profile.authMode,
    profile.basicCredentials.username,
  )

  return profile.name === previousGeneratedName
    ? createProfileName(draft.baseUrl, draft.authMode, draft.basicCredentials.username)
    : profile.name
}

type SaveAndConnectParams = {
  draft: ConnectionDraft
  profileId: string | null
}

function ConnectPage() {
  const { locale, messages } = useI18n()
  const {
    baseUrl,
    authMode,
    basicCredentials,
    syncEnabled,
    uploadEnabled,
    applyConnection,
    markValidated,
  } = useConnectionStore()
  const profiles = useSavedConnectionsStore((state) => state.profiles)
  const activeProfileId = useSavedConnectionsStore((state) => state.activeProfileId)
  const saveProfile = useSavedConnectionsStore((state) => state.saveProfile)
  const setActiveProfile = useSavedConnectionsStore((state) => state.setActiveProfile)
  const deleteProfile = useSavedConnectionsStore((state) => state.deleteProfile)
  const notify = useNotify()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()
  const clearAllMediaPreviews = useExplorerUIStore((state) => state.clearAllMediaPreviews)
  const setOverviewMemStats = useOverviewStore((state) => state.setMemStats)
  const runtimeDraft = useMemo(() => toDraftFromConnection({
    baseUrl,
    authMode,
    basicCredentials,
    syncEnabled,
    uploadEnabled,
  }), [authMode, baseUrl, basicCredentials, syncEnabled, uploadEnabled])
  const [initialSelectedProfileId] = useState<string | null>(() => {
    const activeProfile = activeProfileId === null
      ? null
      : profiles.find((profile) => profile.id === activeProfileId) ?? null

    return activeProfile && areDraftSettingsEqual(runtimeDraft, activeProfile) ? activeProfile.id : null
  })
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    () => initialSelectedProfileId,
  )
  const [currentDraft, setCurrentDraft] = useState<ConnectionDraft>(
    () => {
      const activeProfile = initialSelectedProfileId === null
        ? null
        : profiles.find((profile) => profile.id === initialSelectedProfileId) ?? null

      return activeProfile ? toDraftFromProfile(activeProfile) : runtimeDraft
    },
  )
  const currentProfile = useMemo(
    () => (selectedProfileId === null
      ? null
      : profiles.find((profile) => profile.id === selectedProfileId) ?? null),
    [selectedProfileId, profiles],
  )
  const updateCurrentDraft = (updater: (draft: ConnectionDraft) => ConnectionDraft) => {
    validateConnection.reset()
    setCurrentDraft((draft) => updater(draft))
  }

  const validateConnection = useMutation({
    mutationFn: async ({ draft }: SaveAndConnectParams) => {
      const targetBaseUrl = draft.baseUrl
      const targetAuthMode = draft.authMode
      const targetBasicCredentials = draft.basicCredentials

      return validateConnectionAndDetectAuthMode({
        baseUrl: targetBaseUrl,
        authMode: targetAuthMode,
        basicCredentials: targetBasicCredentials,
      })
    },
    onSuccess: (result, params) => {
      const nextBaseUrl = params.draft.baseUrl
      const nextAuthMode = result.authMode
      const nextBasicCredentials = params.draft.basicCredentials
      const nextSyncEnabled = params.draft.syncEnabled
      const nextUploadEnabled = params.draft.uploadEnabled
      const nextDraft = {
        baseUrl: nextBaseUrl,
        authMode: nextAuthMode,
        basicCredentials: nextBasicCredentials,
        syncEnabled: nextSyncEnabled,
        uploadEnabled: nextUploadEnabled,
      }
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

      const targetProfile = params.profileId === null
        ? null
        : profiles.find((profile) => profile.id === params.profileId) ?? null

      if (targetProfile === null) {
        const nextProfileId = saveProfile({
          name: "",
          baseUrl: nextDraft.baseUrl,
          authMode: nextDraft.authMode,
          basicCredentials: nextDraft.basicCredentials,
          syncEnabled: nextDraft.syncEnabled,
          uploadEnabled: nextDraft.uploadEnabled,
        })

        setSelectedProfileId(nextProfileId)
        setCurrentDraft(nextDraft)
        setActiveProfile(nextProfileId)
      } else {
        saveProfile({
          id: targetProfile.id,
          name: resolveSavedProfileName(targetProfile, nextDraft),
          baseUrl: nextDraft.baseUrl,
          authMode: nextDraft.authMode,
          basicCredentials: nextDraft.basicCredentials,
          syncEnabled: nextDraft.syncEnabled,
          uploadEnabled: nextDraft.uploadEnabled,
        })

        setCurrentDraft(nextDraft)
        setSelectedProfileId(targetProfile.id)
        setActiveProfile(targetProfile.id)
      }

      applyConnection(nextDraft)
      markValidated(result.serverInfo)
      notify({
        color: "green",
        title: messages.connect.connectionSaved(),
        message: messages.connect.connectionSavedMessage(),
      })
    },
    onError: (error) => {
      void error
    },
  })
  const isValidationPending = validateConnection.isPending

  const handleApplySavedConnection = (profileId: string) => {
    if (isValidationPending) {
      return
    }

    if (!profileId) {
      validateConnection.reset()
      setSelectedProfileId(null)
      setCurrentDraft(runtimeDraft)
      setActiveProfile(null)
      return
    }

    const profile = profiles.find((item) => item.id === profileId)
    if (!profile) {
      return
    }

    validateConnection.reset()
    const profileDraft = toDraftFromProfile(profile)
    setSelectedProfileId(profile.id)
    setCurrentDraft(profileDraft)
    setActiveProfile(profile.id)
    validateConnection.mutate({
      draft: profileDraft,
      profileId: profile.id,
    })
  }

  const handleSaveCurrent = () => {
    if (isValidationPending) {
      return
    }

    validateConnection.mutate({
      draft: currentDraft,
      profileId: selectedProfileId,
    })
  }

  const handleDeleteSelected = () => {
    if (isValidationPending) {
      return
    }

    if (selectedProfileId === null || !currentProfile) {
      return
    }

    const deletedProfileId = currentProfile.id
    const deletedDraft = currentDraft

    deleteProfile(deletedProfileId)
    if (activeProfileId === deletedProfileId) {
      setActiveProfile(null)
    }
    setCurrentDraft(deletedDraft)
    setSelectedProfileId(null)
    validateConnection.reset()
    notify({
      color: "green",
      title: messages.connect.savedConnectionRemoved(),
      message: messages.connect.savedConnectionRemovedMessage(currentProfile.name),
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
                    disabled={isValidationPending}
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
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 gap-1.5"
                  onClick={handleSaveCurrent}
                  disabled={isValidationPending}
                >
                  <Save className="h-3.5 w-3.5" />
                  {messages.connect.saveCurrent()}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("h-11 w-11 shrink-0", selectedProfileId === null && "pointer-events-none opacity-40")}
                  onClick={handleDeleteSelected}
                  disabled={isValidationPending}
                  aria-label={messages.connect.deleteSavedConnection()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <label className="flex flex-col gap-2">
                <span className="app-field-label">{messages.connect.baseUrl()}</span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder={resolveInputExample(inputExamples.rcBaseUrl, locale)}
                    value={currentDraft.baseUrl}
                    disabled={isValidationPending}
                    onChange={(event) => {
                      const nextValue = event.currentTarget.value
                      updateCurrentDraft((draft) => ({
                        ...draft,
                        baseUrl: nextValue,
                      }))
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 shrink-0 self-start"
                    onClick={() => {
                      const nextValue = getDefaultBaseUrl()
                      updateCurrentDraft((draft) => ({
                        ...draft,
                        baseUrl: nextValue,
                      }))
                    }}
                    disabled={isValidationPending}
                  >
                    {messages.connect.useCurrentUrl()}
                  </Button>
                </div>
                <span className="app-help-text">{messages.connect.baseUrlDescription()}</span>
              </label>

              <label className="flex flex-col gap-2">
                <span className="app-field-label">{messages.connect.authMode()}</span>
                <NativeSelect
                  value={currentDraft.authMode}
                  disabled={isValidationPending}
                  onChange={(event) => {
                    const value = event.currentTarget.value
                    if (value === "basic" || value === "none") {
                      updateCurrentDraft((draft) => ({
                        ...draft,
                        authMode: value,
                      }))
                    }
                  }}
                >
                  <option value="basic">{messages.connect.authBasic()}</option>
                  <option value="none">{messages.connect.authNone()}</option>
                </NativeSelect>
                <span className="app-help-text">{messages.connect.authModeDescription()}</span>
              </label>

              {currentDraft.authMode === "basic" ? (
                <>
                  <label className="flex flex-col gap-2">
                    <span className="app-field-label">{messages.connect.username()}</span>
                    <Input
                      value={currentDraft.basicCredentials.username}
                      disabled={isValidationPending}
                      onChange={(event) => {
                        const nextValue = event.currentTarget.value
                        updateCurrentDraft((draft) => ({
                          ...draft,
                          basicCredentials: {
                            ...draft.basicCredentials,
                            username: nextValue,
                          },
                        }))
                      }}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="app-field-label">{messages.connect.password()}</span>
                    <Input
                      type="password"
                      value={currentDraft.basicCredentials.password}
                      disabled={isValidationPending}
                      onChange={(event) => {
                        const nextValue = event.currentTarget.value
                        updateCurrentDraft((draft) => ({
                          ...draft,
                          basicCredentials: {
                            ...draft.basicCredentials,
                            password: nextValue,
                          },
                        }))
                      }}
                    />
                  </label>
                </>
              ) : null}

              <label className="flex items-start gap-3 rounded-[12px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-3 py-3">
                <Checkbox
                  aria-label={messages.connect.syncEnabled()}
                  checked={currentDraft.syncEnabled}
                  disabled={isValidationPending}
                  onChange={async (event) => {
                    const nextChecked = event.currentTarget.checked
                    if (nextChecked && !currentDraft.syncEnabled) {
                      const confirmed = await confirm({
                        title: messages.connect.syncRiskTitle(),
                        message: messages.connect.syncRiskMessage(),
                        confirmLabel: messages.common.confirm(),
                      })

                      if (!confirmed) {
                        return
                      }
                    }

                    updateCurrentDraft((draft) => ({
                      ...draft,
                      syncEnabled: nextChecked,
                    }))
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
                  checked={currentDraft.uploadEnabled}
                  disabled={isValidationPending}
                  onChange={async (event) => {
                    const nextChecked = event.currentTarget.checked
                    if (nextChecked && !currentDraft.uploadEnabled) {
                      const confirmed = await confirm({
                        title: messages.connect.uploadRiskTitle(),
                        message: messages.connect.uploadRiskMessage(),
                        confirmLabel: messages.common.confirm(),
                      })

                      if (!confirmed) {
                        return
                      }
                    }

                    updateCurrentDraft((draft) => ({
                      ...draft,
                      uploadEnabled: nextChecked,
                    }))
                  }}
                />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[13px] font-bold text-[color:var(--app-text)]">{messages.connect.uploadEnabled()}</span>
                  <span className="app-help-text">{messages.connect.uploadEnabledDescription()}</span>
                </span>
              </label>

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

