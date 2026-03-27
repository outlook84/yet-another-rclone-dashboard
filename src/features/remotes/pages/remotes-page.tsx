import { Loader2 } from "lucide-react"
import { Fragment, useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { useExplorerCleanupMutation } from "@/features/explorer/api/use-explorer-cleanup-mutation"
import { useExplorerFsInfoQuery } from "@/features/explorer/api/use-explorer-fs-info-query"
import { useExplorerUsageQuery } from "@/features/explorer/api/use-explorer-usage-query"
import { formatBytes } from "@/features/explorer/lib/display-utils"
import { useExplorerStore } from "@/features/explorer/store/explorer-store"
import { useCreateRemoteMutation } from "@/features/remotes/api/use-create-remote-mutation"
import { useDeleteRemoteMutation } from "@/features/remotes/api/use-delete-remote-mutation"
import { useRemoteDetailQuery } from "@/features/remotes/api/use-remote-detail-query"
import { useRemotesQuery } from "@/features/remotes/api/use-remotes-query"
import { useUpdateRemoteMutation } from "@/features/remotes/api/use-update-remote-mutation"
import { useRemoteCleanupStore } from "@/features/remotes/store/remote-cleanup-store"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConfirm } from "@/shared/components/confirm-provider"
import { MutationFeedbacks } from "@/shared/components/mutation-feedbacks"
import { useNotify } from "@/shared/components/notification-provider"
import { PageShell } from "@/shared/components/page-shell"
import { QueryErrorAlert } from "@/shared/components/query-error-alert"
import { EmptyState } from "@/shared/components/empty-state"
import { LoadingState } from "@/shared/components/loading-state"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { InlineCode } from "@/shared/components/ui/inline-code"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet"
import { Textarea } from "@/shared/components/ui/textarea"
import { useI18n } from "@/shared/i18n"
import { formatLocalizedNumber } from "@/shared/i18n/formatters"
import { inputExamples, resolveInputExample } from "@/shared/i18n/input-examples"
import { cn } from "@/shared/lib/cn"
import { useMediaQuery } from "@/shared/hooks/use-media-query"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"
import { useConnectionStore } from "@/shared/store/connection-store"

const CLEANUP_COOLDOWN_MS = 30_000

function RemotesPage() {
  const { locale, messages } = useI18n()
  const api = useAppApi()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const connectionScope = useConnectionScope()
  const remotesQuery = useRemotesQuery()
  const setLocation = useExplorerStore((state) => state.setLocation)
  const baseUrl = useConnectionStore((state) => state.baseUrl)
  const [selectedRemote, setSelectedRemote] = useState<string | null>(null)
  const [remoteConfigDraft, setRemoteConfigDraft] = useState("")
  const [importJsonDraft, setImportJsonDraft] = useState("")
  const remoteDetailQuery = useRemoteDetailQuery(selectedRemote)
  const remoteFsInfoQuery = useExplorerFsInfoQuery(selectedRemote ?? "")
  const supportsAbout = Boolean(remoteFsInfoQuery.data?.features?.About)
  const remoteUsageQuery = useExplorerUsageQuery(selectedRemote ?? "", supportsAbout)
  const cleanupMutation = useExplorerCleanupMutation()
  const createRemoteMutation = useCreateRemoteMutation()
  const deleteRemoteMutation = useDeleteRemoteMutation()
  const updateRemoteMutation = useUpdateRemoteMutation()
  const confirm = useConfirm()
  const notify = useNotify()
  const [isExportingConfig, setIsExportingConfig] = useState(false)
  const [isImportSheetOpen, setIsImportSheetOpen] = useState(false)
  const isPointerDevice = useMediaQuery("(pointer: fine) and (min-aspect-ratio: 4/3)")
  const isWideRemotesLayout = useMediaQuery("(min-width: 1280px)")
  const supportsCleanup = Boolean(remoteFsInfoQuery.data?.features?.CleanUp)
  const lastRunAtBySource = useRemoteCleanupStore((state) => state.lastRunAtBySource)
  const markCleanupRun = useRemoteCleanupStore((state) => state.markRun)
  const cleanupSourceKey = useMemo(
    () => (selectedRemote ? `${baseUrl}::${selectedRemote}` : null),
    [baseUrl, selectedRemote],
  )
  const lastCleanupAt = cleanupSourceKey ? lastRunAtBySource[cleanupSourceKey] : undefined
  const cooldownRemainingMs = lastCleanupAt
    ? Math.max(0, CLEANUP_COOLDOWN_MS - (Date.now() - new Date(lastCleanupAt).getTime()))
    : 0
  const isCleanupCoolingDown = cooldownRemainingMs > 0

  const parsedRemoteConfigDraft = useMemo(() => {
    const draft = remoteConfigDraft.trim()
    if (!draft) {
      return { config: null, error: null as string | null }
    }

    try {
      const parsed = JSON.parse(draft) as unknown
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        return {
          config: null,
          error: messages.remotes.remoteJsonMustBeObject(),
        }
      }

      return {
        config: parsed as Record<string, unknown>,
        error: null,
      }
    } catch (error) {
      return {
        config: null,
        error: error instanceof Error ? error.message : messages.remotes.invalidJson(),
      }
    }
  }, [messages.remotes, remoteConfigDraft])

  const parsedImportConfig = useMemo(() => {
    const draft = importJsonDraft.trim()
    if (!draft) {
      return { configMap: null, error: null as string | null }
    }

    try {
      const parsed = JSON.parse(draft) as unknown
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        return {
          configMap: null,
          error: messages.remotes.importJsonMustBeDumpObject(),
        }
      }

      return {
        configMap: parsed as Record<string, unknown>,
        error: null,
      }
    } catch (error) {
      return {
        configMap: null,
        error: error instanceof Error ? error.message : messages.remotes.invalidJson(),
      }
    }
  }, [importJsonDraft, messages.remotes])

  const importPlan = useMemo(() => {
    const configMap = parsedImportConfig.configMap
    const existingNames = new Set((remotesQuery.data ?? []).map((remote) => remote.name))

    if (!configMap) {
      return {
        totalNames: 0,
        importable: [] as Array<{ name: string; config: Record<string, unknown> }>,
        skippedExisting: [] as string[],
        invalidEntries: [] as string[],
      }
    }

    const importable: Array<{ name: string; config: Record<string, unknown> }> = []
    const skippedExisting: string[] = []
    const invalidEntries: string[] = []

    Object.entries(configMap).forEach(([name, value]) => {
      if (!value || Array.isArray(value) || typeof value !== "object") {
        invalidEntries.push(name)
        return
      }

      const remoteConfig = value as Record<string, unknown>
      if (typeof remoteConfig.type !== "string" || !remoteConfig.type.trim()) {
        invalidEntries.push(name)
        return
      }

      if (existingNames.has(name)) {
        skippedExisting.push(name)
        return
      }

      importable.push({
        name,
        config: remoteConfig,
      })
    })

    return {
      totalNames: Object.keys(configMap).length,
      importable,
      skippedExisting,
      invalidEntries,
    }
  }, [parsedImportConfig.configMap, remotesQuery.data])

  const canImportRemote = importPlan.importable.length > 0
  const canSaveRemoteConfig =
    Boolean(selectedRemote) &&
    Boolean(parsedRemoteConfigDraft.config) &&
    !parsedRemoteConfigDraft.error

  const downloadJson = (filename: string, data: Record<string, unknown>) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!selectedRemote) {
      setRemoteConfigDraft("")
      return
    }

    if (remoteDetailQuery.data) {
      setRemoteConfigDraft(JSON.stringify(remoteDetailQuery.data.config, null, 2))
    }
  }, [remoteDetailQuery.data, selectedRemote])

  const inspectRemote = (remoteName: string) => {
    setRemoteConfigDraft("")
    setSelectedRemote(remoteName)
    void queryClient.invalidateQueries({
      queryKey: queryKeys.remote(connectionScope, remoteName),
    })
    void queryClient.invalidateQueries({
      queryKey: [...queryKeys.explorer(connectionScope, remoteName, ""), "fsinfo"],
    })
    void queryClient.invalidateQueries({
      queryKey: [...queryKeys.explorer(connectionScope, remoteName, ""), "usage"],
    })
  }

  const showSplitDetailPane = Boolean(selectedRemote) && isWideRemotesLayout

  const renderRemoteDetail = (showSectionHeader: boolean) => (
    <div className="min-w-0 flex flex-col gap-2.5">
      {showSectionHeader ? (
        <div className="app-toolbar-row">
          <h2 className="app-section-title">{messages.remotes.remoteDetail()}</h2>
          <Button size="sm" variant="secondary" onClick={() => setSelectedRemote(null)}>
            {messages.common.close()}
          </Button>
        </div>
      ) : null}

      {remoteDetailQuery.isLoading ? <LoadingState message={messages.remotes.loadingDetail()} /> : null}
      {remoteDetailQuery.error ? (
        <QueryErrorAlert title={messages.remotes.failedToLoadRemoteDetail()} error={remoteDetailQuery.error} />
      ) : null}
      {remoteFsInfoQuery.error ? (
        <QueryErrorAlert
          title={messages.remotes.capabilitySummaryUnavailable()}
          error={remoteFsInfoQuery.error}
          color="yellow"
        />
      ) : null}
      {remoteUsageQuery.error ? (
        <QueryErrorAlert
          title={messages.remotes.usageSummaryUnavailable()}
          error={remoteUsageQuery.error}
          color="yellow"
        />
      ) : null}

      {remoteDetailQuery.data ? (
        <div className="min-w-0 flex flex-col gap-2.5">
          {!showSectionHeader ? (
            <div className="app-toolbar-row">
              <div className="text-[13px] font-bold text-[color:var(--app-text)]">{messages.remotes.remoteDetail()}</div>
              <Button size="sm" variant="secondary" onClick={() => setSelectedRemote(null)}>
                {messages.common.close()}
              </Button>
            </div>
          ) : null}
          <div className="app-toolbar-row">
            <div className="text-[13px] font-bold text-[color:var(--app-text)]">
              {remoteDetailQuery.data.name}
            </div>
            <div className="app-toolbar-actions">
              {supportsCleanup ? (
                <Button
                  size="xs"
                  variant="secondary"
                  disabled={cleanupMutation.isPending || isCleanupCoolingDown}
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: messages.remotes.cleanupRemoteTrash(),
                      message: messages.remotes.cleanupRemoteTrashMessage(remoteDetailQuery.data.name),
                      confirmLabel: messages.remotes.runCleanup(),
                    })

                    if (!confirmed) {
                      return
                    }

                    await cleanupMutation.mutateAsync({
                      remote: remoteDetailQuery.data.name,
                    })
                    if (cleanupSourceKey) {
                      markCleanupRun(cleanupSourceKey, new Date().toISOString())
                    }
                    notify({
                      color: "green",
                      title: messages.remotes.cleanupStarted(),
                      message: messages.remotes.cleanupStartedMessage(remoteDetailQuery.data.name),
                    })
                  }}
                >
                  {cleanupMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  {messages.remotes.cleanup()}
                </Button>
              ) : null}
              <Button
                size="xs"
                variant="danger"
                disabled={
                  deleteRemoteMutation.isPending &&
                  deleteRemoteMutation.variables === remoteDetailQuery.data.name
                }
                onClick={async () => {
                  const confirmed = await confirm({
                    title: messages.remotes.deleteRemote(),
                    message: messages.remotes.deleteRemoteMessage(remoteDetailQuery.data.name),
                    confirmLabel: messages.remotes.deleteRemote(),
                  })

                  if (!confirmed) {
                    return
                  }

                  await deleteRemoteMutation.mutateAsync(remoteDetailQuery.data.name)
                  setSelectedRemote(null)
                  notify({
                    color: "green",
                    title: messages.remotes.remoteDeleted(),
                    message: messages.remotes.remoteDeletedMessage(remoteDetailQuery.data.name),
                  })
                }}
              >
                {messages.common.delete()}
              </Button>
            </div>
          </div>

          {supportsAbout ? (
            <div className="app-workspace-card app-card-pad">
              <div className="mb-3 text-[13px] font-bold text-[color:var(--app-text)]">{messages.remotes.usage()}</div>
              {remoteUsageQuery.isLoading ? (
                <p className="text-sm text-[color:var(--app-text-soft)]">{messages.remotes.loadingUsage()}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-[10px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-3 py-2">
                    <div className="text-[12px] font-normal text-[color:var(--app-text-soft)]">{messages.remotes.trashed()}</div>
                    <div className="mt-1 text-[15px] font-bold text-[color:var(--app-text)]">
                      {formatBytes(remoteUsageQuery.data?.trashed, locale)}
                    </div>
                  </div>
                  <div className="rounded-[10px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-3 py-2">
                    <div className="text-[12px] font-normal text-[color:var(--app-text-soft)]">{messages.remotes.used()}</div>
                    <div className="mt-1 text-[15px] font-bold text-[color:var(--app-text)]">
                      {formatBytes(remoteUsageQuery.data?.used, locale)}
                    </div>
                  </div>
                  <div className="rounded-[10px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-3 py-2">
                    <div className="text-[12px] font-normal text-[color:var(--app-text-soft)]">{messages.remotes.free()}</div>
                    <div className="mt-1 text-[15px] font-bold text-[color:var(--app-text)]">
                      {formatBytes(remoteUsageQuery.data?.free, locale)}
                    </div>
                  </div>
                  <div className="rounded-[10px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-3 py-2">
                    <div className="text-[12px] font-normal text-[color:var(--app-text-soft)]">{messages.remotes.total()}</div>
                    <div className="mt-1 text-[15px] font-bold text-[color:var(--app-text)]">
                      {formatBytes(remoteUsageQuery.data?.total, locale)}
                    </div>
                  </div>
                  <div className="rounded-[10px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-3 py-2">
                    <div className="text-[12px] font-normal text-[color:var(--app-text-soft)]">{messages.remotes.other()}</div>
                    <div className="mt-1 text-[15px] font-bold text-[color:var(--app-text)]">
                      {formatBytes(remoteUsageQuery.data?.other, locale)}
                    </div>
                  </div>
                  <div className="rounded-[10px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-3 py-2">
                    <div className="text-[12px] font-normal text-[color:var(--app-text-soft)]">{messages.remotes.objects()}</div>
                    <div className="mt-1 text-[15px] font-bold text-[color:var(--app-text)]">
                      {formatLocalizedNumber(remoteUsageQuery.data?.objects, locale)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : remoteFsInfoQuery.data ? (
            <div className="rounded-[10px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-3 py-2 text-sm text-[color:var(--app-text-soft)]">
              {messages.remotes.backendUsageUnavailable()}
            </div>
          ) : null}

          <label className="text-[13px] font-bold text-[color:var(--app-text)]">{messages.remotes.configJson()}</label>
          <Textarea
            className="min-h-[260px] font-mono text-sm"
            value={remoteConfigDraft}
            onChange={(event) => setRemoteConfigDraft(event.currentTarget.value)}
          />
          {parsedRemoteConfigDraft.error ? (
            <p className="app-danger-text text-sm">{parsedRemoteConfigDraft.error}</p>
          ) : null}
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              disabled={!canSaveRemoteConfig}
              onClick={async () => {
                if (!parsedRemoteConfigDraft.config) {
                  return
                }

                const remote = await updateRemoteMutation.mutateAsync({
                  name: remoteDetailQuery.data.name,
                  config: parsedRemoteConfigDraft.config,
                })

                setRemoteConfigDraft(JSON.stringify(remote.config, null, 2))
                notify({
                  color: "green",
                  title: messages.remotes.remoteUpdated(),
                  message: messages.remotes.remoteUpdatedMessage(remote.name),
                })
              }}
            >
              {updateRemoteMutation.isPending &&
              updateRemoteMutation.variables?.name === remoteDetailQuery.data.name ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              {messages.remotes.updateRemote()}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )

  return (
    <PageShell title={messages.remotes.title()} hideBadge hideHeader bareContent contentStyle={{ paddingTop: 4 }}>
      <div className="app-page-stack">
        {remotesQuery.isLoading ? (
          <LoadingState message={messages.remotes.loadingRemotes()} />
        ) : null}
        {remotesQuery.error ? <QueryErrorAlert title={messages.remotes.failedToLoadRemotes()} error={remotesQuery.error} /> : null}

        {remotesQuery.data ? (
          remotesQuery.data.length > 0 ? (
            <>
              <div className="app-toolbar-row">
                <div>
                  <h2 className="app-section-title">{messages.remotes.remoteList()}</h2>
                </div>
                <div className="app-toolbar-actions">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={remotesQuery.isFetching}
                    onClick={() => {
                      void remotesQuery.refetch()
                    }}
                  >
                    {remotesQuery.isFetching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                    {messages.remotes.refresh()}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isExportingConfig}
                    onClick={async () => {
                      setIsExportingConfig(true)
                      try {
                        const dump = await api.remotes.dump()
                        downloadJson("rclone-config-export.json", dump)
                        notify({
                          color: "green",
                          title: messages.remotes.configExported(),
                          message: messages.remotes.configExportedMessage(),
                        })
                      } finally {
                        setIsExportingConfig(false)
                      }
                    }}
                  >
                    {isExportingConfig ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                    {messages.remotes.exportFullConfig()}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setIsImportSheetOpen(true)}>
                    {messages.remotes.importConfigJson()}
                  </Button>
                </div>
              </div>

              <div
                className={cn(
                  "grid grid-cols-1 gap-4",
                  showSplitDetailPane
                    ? "xl:grid-cols-2 xl:items-start"
                    : !selectedRemote && isPointerDevice
                      ? "max-w-[50%]"
                      : "",
                )}
              >
                <Card className="app-workspace-card overflow-hidden">
                  <CardContent className="p-0">
                    <div className="divide-y divide-[color:var(--app-border)]">
                      {remotesQuery.data.map((remote) => {
                        const isSelected = selectedRemote === remote.name

                        return (
                          <Fragment key={remote.name}>
                            <div
                              className={cn(
                                "relative flex items-center justify-between gap-4 px-4 py-2.5 transition-colors",
                                isSelected
                                  ? "bg-[image:var(--remote-card-selected-bg)]"
                                  : "bg-[color:var(--remote-card-bg)] hover:bg-[color:var(--app-hover-surface)]",
                              )}
                            >
                              {isSelected ? (
                                <div className="absolute bottom-2 left-0 top-2 w-1 rounded-full bg-[color:var(--remote-card-selected-rail)]" />
                              ) : null}
                              <div className="min-w-0 flex-1 pl-2">
                                <div
                                  className={cn(
                                    "break-all text-[13px] font-bold",
                                    isSelected
                                      ? "text-[color:var(--remote-card-selected-text)]"
                                      : "text-[color:var(--app-text)]",
                                  )}
                                >
                                  {remote.name}
                                </div>
                                <div
                                  className={cn(
                                    "mt-0.5 text-[12px]",
                                    isSelected
                                      ? "text-[color:var(--remote-card-selected-text-soft)]"
                                      : "text-[color:var(--app-text-soft)]",
                                  )}
                                >
                                  {remote.backend ?? messages.remotes.backendUnknown()}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    void inspectRemote(remote.name)
                                  }}
                                >
                                  {messages.remotes.inspect()}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setLocation(remote.name, "")
                                    navigate("/explorer")
                                  }}
                                >
                                  {messages.remotes.browse()}
                                </Button>
                              </div>
                            </div>

                            {isSelected && !isWideRemotesLayout ? (
                              <div className="bg-[color:var(--app-panel-strong)] px-4 py-4">
                                {renderRemoteDetail(false)}
                              </div>
                            ) : null}
                          </Fragment>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {showSplitDetailPane ? renderRemoteDetail(true) : null}

              </div>
              <Sheet open={isImportSheetOpen} onOpenChange={setIsImportSheetOpen}>
                <SheetContent side="right" className="w-full overflow-y-auto sm:w-[420px]">
                  <SheetHeader>
                    <SheetTitle>{messages.remotes.importJsonTitle()}</SheetTitle>
                    <SheetDescription>
                      {messages.remotes.importJsonDescription(<InlineCode>rclone config dump</InlineCode>)}
                    </SheetDescription>
                  </SheetHeader>

                  <div className="flex min-h-0 flex-col gap-3 pb-10">
                    <label className="text-[13px] font-normal text-[color:var(--app-text-soft)]">{messages.remotes.remoteJson()}</label>
                    <Textarea
                      className="min-h-[240px] font-mono"
                      placeholder={resolveInputExample(inputExamples.remoteConfigDump, locale)}
                      value={importJsonDraft}
                      onChange={(event) => setImportJsonDraft(event.currentTarget.value)}
                    />
                    {parsedImportConfig.error ? <p className="app-danger-text text-sm">{parsedImportConfig.error}</p> : null}

                    {parsedImportConfig.configMap ? (
                      <div className="grid grid-cols-2 gap-2 text-sm text-[color:var(--app-text-soft)]">
                        <div>{messages.remotes.jsonRemotes()}: {importPlan.totalNames}</div>
                        <div>{messages.remotes.importable()}: {importPlan.importable.length}</div>
                        <div>{messages.remotes.existing()}: {importPlan.skippedExisting.length}</div>
                        <div>{messages.remotes.invalid()}: {importPlan.invalidEntries.length}</div>
                      </div>
                    ) : null}

                    {importPlan.skippedExisting.length > 0 ? (
                      <p className="text-[12px] text-[color:var(--app-text-soft)]">
                        {messages.remotes.skippingExisting(
                          importPlan.skippedExisting.slice(0, 6).join(", "),
                          importPlan.skippedExisting.length > 6,
                        )}
                      </p>
                    ) : null}
                    {importPlan.invalidEntries.length > 0 ? (
                      <p className="text-[12px] text-[color:var(--app-text-soft)]">
                        {messages.remotes.invalidEntries(
                          importPlan.invalidEntries.slice(0, 6).join(", "),
                          importPlan.invalidEntries.length > 6,
                        )}
                      </p>
                    ) : null}

                    <p className="text-[12px] text-[color:var(--app-text-soft)]">
                      {messages.remotes.importScopeNote(<InlineCode>config/create</InlineCode>)}
                    </p>

                    <div className="app-sticky-footer sticky bottom-0 mt-auto flex justify-end pt-3">
                      <Button
                        size="sm"
                        disabled={!canImportRemote || createRemoteMutation.isPending}
                        onClick={async () => {
                          if (!canImportRemote) {
                            return
                          }

                          let lastImportedName = ""
                          for (const remote of importPlan.importable) {
                            await createRemoteMutation.mutateAsync({
                              name: remote.name,
                              config: remote.config,
                            })
                            lastImportedName = remote.name
                          }

                          if (lastImportedName) {
                            setSelectedRemote(lastImportedName)
                          }
                          setImportJsonDraft("")
                          setIsImportSheetOpen(false)
                          notify({
                            color: "green",
                            title: messages.remotes.remotesImported(),
                            message: messages.remotes.remotesImportedMessage(importPlan.importable.length),
                          })
                        }}
                      >
                        {createRemoteMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                        {messages.remotes.importMissingRemotes()}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <EmptyState description={messages.remotes.noRemotes()} />
          )
        ) : null}

        <MutationFeedbacks
          configs={[
            {
              key: "cleanup",
              mutation: cleanupMutation,
              errorTitle: messages.remotes.cleanupFailed(),
            },
            {
              key: "create-remote",
              mutation: createRemoteMutation,
              errorTitle: messages.remotes.importFailed(),
            },
            {
              key: "delete-remote",
              mutation: deleteRemoteMutation,
              errorTitle: messages.remotes.deleteRemoteFailed(),
            },
            {
              key: "update-remote",
              mutation: updateRemoteMutation,
              errorTitle: messages.remotes.updateRemoteFailed(),
            },
          ]}
        />
      </div>
    </PageShell>
  )
}

export { RemotesPage }
