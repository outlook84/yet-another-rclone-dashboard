import { Loader2, Save, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { createRcloneRcAppApiClient } from "@/shared/api/client/app-api-client"
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
import { useSavedConnectionsStore } from "@/features/auth/store/saved-connections-store"
import { useConnectionStore } from "@/shared/store/connection-store"

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
  const [syncEnabledDraft, setSyncEnabledDraft] = useState(false)
  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  )

  useEffect(() => {
    setSyncEnabledDraft(selectedProfile?.syncEnabled ?? false)
  }, [selectedProfile?.id, selectedProfile?.syncEnabled])

  const validateConnection = useMutation({
    mutationFn: async (params?: { baseUrl: string; authMode: string; basicCredentials?: typeof basicCredentials }) => {
      const targetBaseUrl = params?.baseUrl ?? baseUrl
      const targetAuthMode = params?.authMode ?? authMode
      const targetBasicCredentials = params?.basicCredentials ?? basicCredentials

      const client = createRcloneRcAppApiClient({
        baseUrl: targetBaseUrl,
        authMode: targetAuthMode as "basic" | "none",
        basicCredentials: targetBasicCredentials!,
      })

      const [ping, serverInfo] = await Promise.all([
        client.session.ping(),
        client.session.getServerInfo(),
      ])

      return { ping, serverInfo }
    },
    onSuccess: (result) => {
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

                    setSyncEnabledDraft(nextChecked)
                  }}
                />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[13px] font-bold text-[color:var(--app-text)]">{messages.connect.syncEnabled()}</span>
                  <span className="app-help-text">{messages.connect.syncEnabledDescription()}</span>
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
