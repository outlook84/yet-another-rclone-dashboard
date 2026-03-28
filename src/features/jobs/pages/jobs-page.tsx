import { ChevronDown, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useSharedGlobalStatsQuery } from "@/features/jobs/api/use-global-stats-query"
import { useStopJobMutation } from "@/features/jobs/api/use-stop-job-mutation"
import { formatBytes, formatEta, getCurrentThroughput } from "@/features/jobs/lib/display-utils"
import { buildGroupDisplayModel, buildTransferDisplayModel, compareTransferDatesDesc } from "@/features/jobs/lib/transfer-display"
import { MutationFeedbacks } from "@/shared/components/mutation-feedbacks"
import { PageShell } from "@/shared/components/page-shell"
import { QueryErrorAlert } from "@/shared/components/query-error-alert"
import { useConfirm } from "@/shared/components/confirm-provider"
import { LoadingState } from "@/shared/components/loading-state"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { EmptyState } from "@/shared/components/empty-state"
import { Table, TableCell, TableHead, TableHeadRow, TableRow, TableScroll } from "@/shared/components/ui/table"
import { useMediaQuery } from "@/shared/hooks/use-media-query"
import { useI18n } from "@/shared/i18n"
import { cn } from "@/shared/lib/cn"

type PastTransfersFilter = "all" | "completed" | "failed"

type ExpandableTextProps = {
  value: string
  compact: boolean
  collapsedClassName?: string
  expandedClassName?: string
}

function ExpandableText({ value, compact, collapsedClassName, expandedClassName }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false)
  const isExpanded = compact && expanded

  if (!compact) {
    return (
      <div title={value} className={collapsedClassName}>
        {value}
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      title={value}
      className={`${isExpanded ? expandedClassName : collapsedClassName} select-text cursor-pointer`}
      onClick={() => setExpanded((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          setExpanded((current) => !current)
        }
      }}
    >
      {value}
    </div>
  )
}

function JobsPage() {
  const { locale, messages } = useI18n()
  const compactText = useMediaQuery("(max-width: 48em)")
  const globalQuery = useSharedGlobalStatsQuery()
  const stopJobMutation = useStopJobMutation()
  const confirm = useConfirm()
  const [pastTransfersFilter, setPastTransfersFilter] = useState<PastTransfersFilter>("all")
  const statsData = globalQuery.data?.stats
  const transferring = statsData?.transferring ?? []
  const grouped = new Map<
    string,
    {
      key: string
      label?: string
      stopTarget?: string
      items: typeof transferring
    }
  >()

  transferring.forEach((item, index) => {
    const key = item.group || item.name || `transfer-${index}`
    const existing = grouped.get(key)
    const stopTarget = item.group?.startsWith("job/") ? item.group : undefined

    if (existing) {
      existing.items.push(item)
      return
    }

    grouped.set(key, {
      key,
      label: item.group?.startsWith("job/") ? undefined : (item.group || undefined),
      stopTarget,
      items: [item],
    })
  })

  const transferGroups = Array.from(grouped.values())
  const hasRunningJobs = transferGroups.length > 0
  const currentThroughput = hasRunningJobs ? getCurrentThroughput(statsData) : 0
  const headerSummary = hasRunningJobs
    ? messages.jobs.activeTransferSummary(transferGroups.length, `${formatBytes(currentThroughput, locale)}/s`)
    : messages.jobs.idleSummary()
  const [activeTransfersExpanded, setActiveTransfersExpanded] = useState(hasRunningJobs)
  const transferredItems = [...(globalQuery.data?.transferred ?? [])].sort((left, right) => {
    const completedDiff = compareTransferDatesDesc(left.completedAt, right.completedAt)
    if (completedDiff !== 0) {
      return completedDiff
    }

    return compareTransferDatesDesc(left.startedAt, right.startedAt)
  })
  const visiblePastTransfers = transferredItems.filter((item) => {
    if (pastTransfersFilter === "completed") {
      return !item.error
    }

    if (pastTransfersFilter === "failed") {
      return Boolean(item.error)
    }

    return true
  })

  useEffect(() => {
    setActiveTransfersExpanded(hasRunningJobs)
  }, [hasRunningJobs])

  return (
    <PageShell title={messages.jobs.title()} hideBadge hideHeader bareContent contentStyle={{ paddingTop: 4 }}>
      <div className="app-page-stack">
        {globalQuery.isLoading && !globalQuery.data ? (
          <LoadingState message={messages.jobs.loadingTransferStats()} />
        ) : null}
        {globalQuery.error ? <QueryErrorAlert title={messages.jobs.failedToLoadTransferStats()} error={globalQuery.error} /> : null}

        <MutationFeedbacks
          configs={[
            {
              key: "stop-job",
              mutation: stopJobMutation,
              successTitle: messages.jobs.jobStopRequested(),
              successMessage: messages.jobs.jobStopRequestedMessage(),
              errorTitle: messages.jobs.stopJobFailed(),
            },
          ]}
        />

        <section className="app-section">
          <div className="app-toolbar-row">
            <button
              type="button"
              onClick={() => setActiveTransfersExpanded((current) => !current)}
              className="flex items-center gap-2 text-left"
            >
              <h2 className="app-section-title">{messages.jobs.activeTransfers()}</h2>
              <ChevronDown
                className={`h-4 w-4 text-[color:var(--app-text-soft)] transition-transform ${activeTransfersExpanded ? "" : "-rotate-90"}`}
              />
            </button>
            <div className="text-[13px] text-[color:var(--app-text-soft)]">{headerSummary}</div>
          </div>
          {activeTransfersExpanded ? transferGroups.length ? (
            <div className="flex flex-col gap-4">
              {transferGroups.map((group) => {
                const stopTarget = group.stopTarget
                const stopLabel = stopTarget ?? group.label
                const groupDisplay = buildGroupDisplayModel(group.items)

                return (
                  <Card key={group.key} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[color:var(--app-text-soft)]">
                              <div
                                title={stopLabel ?? messages.jobs.transfer()}
                                className="font-bold text-[color:var(--app-text)]"
                              >
                                {stopLabel ?? messages.jobs.transfer()}
                              </div>
                              {messages.jobs.transferringFiles(group.items.length)}
                            </div>
                            {groupDisplay.sourceText ? (
                              <ExpandableText
                                compact={compactText}
                                value={`${messages.explorer.source()}: ${groupDisplay.sourceText}`}
                                collapsedClassName="mt-1 max-w-[56rem] truncate text-sm text-[color:var(--app-text-soft)]"
                                expandedClassName="mt-1 max-w-[56rem] text-left whitespace-normal break-all text-sm text-[color:var(--app-text-soft)]"
                              />
                            ) : null}
                            {groupDisplay.destinationText ? (
                              <ExpandableText
                                compact={compactText}
                                value={`${groupDisplay.destinationUsesStorageLabel ? messages.jobs.targetStorage() : messages.explorer.destination()}: ${groupDisplay.destinationText}`}
                                collapsedClassName="mt-1 max-w-[56rem] truncate text-sm text-[color:var(--app-text-soft)]"
                                expandedClassName="mt-1 max-w-[56rem] text-left whitespace-normal break-all text-sm text-[color:var(--app-text-soft)]"
                              />
                            ) : null}
                          </div>
                          {stopTarget ? (
                            <Button
                              size="xs"
                              variant="danger"
                              disabled={stopJobMutation.isPending && String(stopJobMutation.variables) === stopTarget}
                              onClick={async () => {
                                const confirmed = await confirm({
                                  title: messages.jobs.stopJob(),
                                  message: messages.jobs.stopJobMessage(stopTarget),
                                  confirmLabel: messages.jobs.stopJob(),
                                })
                                if (!confirmed) {
                                  return
                                }
                                await stopJobMutation.mutateAsync(stopTarget)
                              }}
                            >
                              {stopJobMutation.isPending && String(stopJobMutation.variables) === stopTarget ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : null}
                              {messages.jobs.stop()}
                            </Button>
                          ) : null}
                        </div>

                        <TableScroll>
                          <Table>
                            <thead>
                              <TableHeadRow className="bg-transparent">
                                <TableHead className="pb-2 pr-4">{messages.jobs.name()}</TableHead>
                                <TableHead className="pb-2 pr-4 whitespace-nowrap">{messages.jobs.progress()}</TableHead>
                                <TableHead className="pb-2 pr-4 whitespace-nowrap">{messages.jobs.transferred()}</TableHead>
                                <TableHead className="pb-2 pr-4 whitespace-nowrap">{messages.jobs.speed()}</TableHead>
                                <TableHead className="pb-2 whitespace-nowrap">{messages.jobs.eta()}</TableHead>
                              </TableHeadRow>
                            </thead>
                            <tbody>
                              {group.items.map((item, index) => {
                                const progressValue =
                                  item.percentage ??
                                  (item.size && item.bytes ? Math.min((item.bytes / item.size) * 100, 100) : undefined)
                                const itemDisplay = buildTransferDisplayModel(item)

                                return (
                                  <TableRow
                                    key={`${group.key}-${item.name ?? "item"}-${index}`}
                                    className="hover:bg-transparent"
                                  >
                                    <TableCell className="py-3 pr-4">
                                      <div className="min-w-0">
                                        <ExpandableText
                                          compact={compactText}
                                          value={itemDisplay.leafName}
                                          collapsedClassName="max-w-[150px] truncate font-medium sm:max-w-[200px] md:max-w-[28rem]"
                                          expandedClassName="max-w-[150px] text-left whitespace-normal break-all font-medium sm:max-w-[200px] md:max-w-[28rem]"
                                        />
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-3 pr-4">
                                      <div className="min-w-[100px] sm:min-w-[180px]">
                                        <div className="h-2.5 overflow-hidden rounded-[999px] bg-[color:var(--app-hover-surface)]">
                                          <div
                                            className="h-full rounded-[999px] bg-[color:var(--app-accent)]"
                                            style={{ width: `${progressValue ?? 0}%` }}
                                          />
                                        </div>
                                        <div className="mt-1 text-[13px] text-[color:var(--app-text-soft)]">
                                          {progressValue !== undefined ? `${Math.round(progressValue)}%` : messages.jobs.calculating()}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-3 pr-4 whitespace-nowrap">
                                      {formatBytes(item.bytes, locale)} / {formatBytes(item.size, locale)}
                                    </TableCell>
                                    <TableCell className="py-3 pr-4 whitespace-nowrap">{formatBytes(item.speed, locale)}/s</TableCell>
                                    <TableCell className="py-3 whitespace-nowrap">{formatEta(item.eta, locale)}</TableCell>
                                  </TableRow>
                                )
                              })}
                            </tbody>
                          </Table>
                        </TableScroll>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="app-surface-subtle border-dashed">
              <CardContent className="p-4 text-sm text-[color:var(--app-text-soft)]">
                {messages.jobs.noActiveTransfers()}
              </CardContent>
            </Card>
          ) : null}
        </section>

        <section className="app-section border-t border-[color:var(--app-border)] pt-5">
          <div className="app-toolbar-row">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="app-section-title">{messages.jobs.pastTransfers()}</h2>
              <p className="text-[13px] text-[color:var(--app-text-soft)]">{messages.jobs.pastTransfersRecentOnly()}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <Button
                size="xs"
                variant={pastTransfersFilter === "all" ? "secondary" : "ghost"}
                className="text-sm"
                onClick={() => setPastTransfersFilter("all")}
              >
                {messages.jobs.allTransfers()}
              </Button>
              <Button
                size="xs"
                variant={pastTransfersFilter === "completed" ? "secondary" : "ghost"}
                className="text-sm"
                onClick={() => setPastTransfersFilter("completed")}
              >
                {messages.jobs.completedTransfers()}
              </Button>
              <Button
                size="xs"
                variant={pastTransfersFilter === "failed" ? "secondary" : "ghost"}
                className="text-sm"
                onClick={() => setPastTransfersFilter("failed")}
              >
                {messages.jobs.failedTransfers()}
              </Button>
            </div>
          </div>

          {globalQuery.isLoading && !globalQuery.data ? (
            <LoadingState message={messages.jobs.pastTransfers()} />
          ) : visiblePastTransfers.length ? (
            <div className="overflow-hidden rounded-[10px] border border-[color:var(--app-border)] bg-[color:var(--app-panel)]">
              {visiblePastTransfers.map((item, index) => {
                const itemDisplay = buildTransferDisplayModel(item)
                const failed = Boolean(item.error)
                const statusLabel = failed ? messages.jobs.statusFailed() : messages.jobs.statusCompleted()

                return (
                  <div
                    key={`${item.group ?? "transfer"}-${item.name ?? "item"}-${item.completedAt ?? index}`}
                    className={`px-4 py-4 ${index === 0 ? "" : "border-t border-[color:var(--app-border)]"}`}
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <ExpandableText
                            compact={compactText}
                            value={itemDisplay.leafName}
                            collapsedClassName="truncate font-medium text-[color:var(--app-text)]"
                            expandedClassName="text-left whitespace-normal break-all font-medium text-[color:var(--app-text)]"
                          />
                          {item.what ? (
                            <span className="rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-2 py-0.5 text-[11px] font-normal text-[color:var(--app-text-soft)]">
                              {item.what}
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-xs font-normal",
                              failed
                                ? "border-[color:var(--app-danger-border)] bg-[color:var(--app-danger-hover-focus-bg)] text-[color:var(--app-danger-text-strong)]"
                                : "border-[color:var(--app-border)] bg-[color:var(--app-surface-subtle)] text-[color:var(--app-text-soft)]",
                            )}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        {itemDisplay.sourceText ? (
                           <ExpandableText
                             compact={compactText}
                             value={`${messages.explorer.source()}: ${itemDisplay.sourceText}`}
                             collapsedClassName="mt-1 truncate text-xs text-[color:var(--app-text-soft)]"
                             expandedClassName="mt-1 text-left whitespace-normal break-all text-xs text-[color:var(--app-text-soft)]"
                           />
                        ) : null}
                        {itemDisplay.destinationText ? (
                          <ExpandableText
                            compact={compactText}
                            value={`${itemDisplay.destinationUsesStorageLabel ? messages.jobs.targetStorage() : messages.explorer.destination()}: ${itemDisplay.destinationText}`}
                             collapsedClassName="mt-1 truncate text-xs text-[color:var(--app-text-soft)]"
                             expandedClassName="mt-1 text-left whitespace-normal break-all text-xs text-[color:var(--app-text-soft)]"
                          />
                        ) : null}
                        {item.error ? (
                          <ExpandableText
                            compact={compactText}
                            value={item.error}
                            collapsedClassName="mt-2 truncate text-sm text-[color:var(--app-danger-text-strong)]"
                            expandedClassName="mt-2 text-left whitespace-normal break-words text-sm text-[color:var(--app-danger-text-strong)]"
                          />
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col gap-1 text-sm text-[color:var(--app-text-soft)] md:items-end">
                        <div className="whitespace-nowrap">
                          {formatBytes(item.bytes, locale)} / {formatBytes(item.size, locale)}
                        </div>
                        {item.completedAt ? (
                          <div className="whitespace-nowrap">
                            {messages.jobs.completedAt()} / {new Date(item.completedAt).toLocaleString(locale)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState description={messages.jobs.noPastTransfers()} />
          )}
        </section>
      </div>
    </PageShell>
  )
}

export { JobsPage }
