import { useEffect, useMemo, useState } from "react"
import { cn } from "@/shared/lib/cn"
import { useRemotesQuery } from "@/features/remotes/api/use-remotes-query"
import { useSharedGlobalStatsQuery } from "@/features/jobs/api/use-global-stats-query"
import { useStatsPollingStore } from "@/features/jobs/store/stats-polling-store"
import { formatBytes, formatElapsedTime, getCurrentThroughput } from "@/features/jobs/lib/display-utils"
import { PageShell } from "@/shared/components/page-shell"
import { QueryErrorAlert } from "@/shared/components/query-error-alert"
import { SummaryCard } from "@/shared/components/summary-card"
import { Card, CardContent } from "@/shared/components/ui/card"
import { InlineCode } from "@/shared/components/ui/inline-code"
import { useConnectionHealthQuery } from "@/shared/hooks/use-connection-health-query"
import { useI18n } from "@/shared/i18n"
import { useConnectionStore } from "@/shared/store/connection-store"
import { useStatsResetMutation } from "@/features/jobs/api/use-stats-reset-mutation"
import { useConfirm } from "@/shared/components/confirm-provider"
import { MutationFeedbacks } from "@/shared/components/mutation-feedbacks"
import { Button } from "@/shared/components/ui/button"
import { useOverviewStore, type ThroughputSample } from "@/features/overview/store/overview-store"
import { RotateCcw } from "lucide-react"

const THROUGHPUT_WINDOW_MS = 5 * 60 * 1000

function useCurrentTime(refreshMs: number) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const intervalMs = Math.max(refreshMs > 0 ? refreshMs : 1000, 1000)
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, intervalMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [refreshMs])

  return now
}

function formatElapsedLabel(seconds: number, locale: "en" | "zh-CN") {
  if (seconds < 60) {
    return locale === "zh-CN" ? `${seconds}秒` : `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60

  return locale === "zh-CN"
    ? remainder === 0
      ? `${minutes}分钟`
      : `${minutes}分${remainder}秒`
    : remainder === 0
      ? `${minutes}m`
      : `${minutes}m ${remainder}s`
}

function ThroughputChart({
  samples,
  refreshMs,
  now,
  locale,
  agoLabel,
  nowLabel,
}: {
  samples: ThroughputSample[]
  refreshMs: number
  now: number
  locale: "en" | "zh-CN"
  agoLabel: string
  nowLabel: string
}) {
  const windowStart = now - THROUGHPUT_WINDOW_MS
  const visibleSamples = samples
    .filter((sample) => sample.at >= windowStart && sample.at <= now)
    .sort((left, right) => left.at - right.at)
  const maxValue = Math.max(...visibleSamples.map((sample) => sample.value), 1)
  const showPeakLabel = maxValue > 1
  const chartTop = 8
  const chartBottom = 89
  const chartHeight = chartBottom - chartTop
  const horizontalGridCount = 15
  const gridLines = Array.from({ length: horizontalGridCount + 1 }, (_, index) => chartTop + (chartHeight * index) / horizontalGridCount)
  const verticalGridCount = 60
  const verticalGridPositions = Array.from({ length: verticalGridCount + 1 }, (_, index) => (index / verticalGridCount) * 100)
  const gapThresholdMs = Math.max(refreshMs > 0 ? refreshMs * 1.5 : 0, 7_500)
  const elapsedLabel =
    locale === "zh-CN"
      ? formatElapsedLabel(Math.round(THROUGHPUT_WINDOW_MS / 1000), locale)
      : `${formatElapsedLabel(Math.round(THROUGHPUT_WINDOW_MS / 1000), locale)} ${agoLabel}`

  const lineSegments: string[] = []
  const areaSegments: string[] = []
  let currentSegment: ThroughputSample[] = []

  const flushSegment = () => {
    if (currentSegment.length === 0) {
      return
    }

    const linePath = currentSegment
      .map((sample, index) => {
        const x = ((sample.at - windowStart) / THROUGHPUT_WINDOW_MS) * 100
        const y = chartBottom - (sample.value / maxValue) * chartHeight
        return `${index === 0 ? "M" : "L"} ${x},${y}`
      })
      .join(" ")

    lineSegments.push(linePath)

    if (currentSegment.length >= 2) {
      const firstX = ((currentSegment[0].at - windowStart) / THROUGHPUT_WINDOW_MS) * 100
      const lastX = ((currentSegment[currentSegment.length - 1].at - windowStart) / THROUGHPUT_WINDOW_MS) * 100
      areaSegments.push(`${linePath} L ${lastX},${chartBottom} L ${firstX},${chartBottom} Z`)
    }

    currentSegment = []
  }

  visibleSamples.forEach((sample, index) => {
    if (index > 0) {
      const previousSample = visibleSamples[index - 1]
      if (sample.at - previousSample.at > gapThresholdMs) {
        flushSegment()
      }
    }

    currentSegment.push(sample)
  })

  flushSegment()

  return (
    <div className="relative h-[220px] w-full overflow-hidden rounded-[8px]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-4 text-xs font-normal text-[color:var(--app-text)]">
        {showPeakLabel ? (
          <span className="app-chart-label absolute left-0 top-1 z-10 px-1.5 py-0.5">{formatBytes(maxValue, locale)}/s</span>
        ) : null}
      </div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        {verticalGridPositions.map((x) => (
          <line
            key={`v-${x}`}
            x1={x}
            x2={x}
            y1={chartTop}
            y2={chartBottom}
            stroke="var(--app-chart-grid)"
            strokeWidth="0.45"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {gridLines.map((y) => (
          <line
            key={y}
            x1="0"
            x2="100"
            y1={y}
            y2={y}
            stroke={y === chartBottom ? "var(--app-chart-axis)" : "var(--app-chart-grid)"}
            strokeWidth={y === chartBottom ? "0.9" : "0.45"}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {areaSegments.map((path) => (
          <path key={`area-${path}`} d={path} fill="var(--app-chart-fill)" />
        ))}
        {lineSegments.map((path) => (
          <path
            key={`line-${path}`}
            d={path}
            fill="none"
            stroke="var(--app-accent)"
            strokeWidth="2.2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-0 py-0.5 text-xs font-normal text-[color:var(--app-text)]">
        <span>{elapsedLabel}</span>
        <span>{nowLabel}</span>
      </div>
    </div>
  )
}

function OverviewPage() {
  const { locale, messages } = useI18n()
  const remotesQuery = useRemotesQuery()
  const statsQuery = useSharedGlobalStatsQuery()
  const statsRefreshMs = useStatsPollingStore((state) => state.intervalMs)
  const baseUrl = useConnectionStore((state) => state.baseUrl)
  const lastServerInfo = useConnectionStore((state) => state.lastServerInfo)
  const speedHistory = useOverviewStore((state) => state.speedHistory)
  const memStats = useOverviewStore((state) => state.memStats)
  const connectionHealthQuery = useConnectionHealthQuery()
  const overviewStats = statsQuery.data?.stats
  const globalStats = statsQuery.data?.globalStats
  const activeTransfers = overviewStats?.transferring?.length ?? 0
  const currentThroughput = activeTransfers > 0 ? getCurrentThroughput(overviewStats) : 0
  const chartNow = useCurrentTime(statsRefreshMs)

  const confirm = useConfirm()
  const resetMutation = useStatsResetMutation()

  const handleReset = async () => {
    if (
      await confirm({
        title: messages.overview.resetStats(),
        message: messages.overview.confirmResetStats(),
        confirmColor: "red",
      })
    ) {
      resetMutation.mutate(undefined)
    }
  }

  const endpointLabel = useMemo(() => {
    try {
      const url = new URL(baseUrl)
      const path = url.pathname === "/" ? "" : url.pathname
      return `${url.host}${path}`
    } catch {
      return baseUrl
    }
  }, [baseUrl])

  return (
    <PageShell title={messages.overview.title()} hideBadge hideHeader bareContent contentStyle={{ paddingTop: 4 }}>
      <div className="app-page-stack">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          <SummaryCard label={messages.overview.rcloneVersion()} value={lastServerInfo?.version ?? messages.common.unknown()} />
          <SummaryCard label={messages.overview.connectedRemotes()} value={remotesQuery.data?.length ?? 0} />
          <SummaryCard
            label={messages.overview.latency()}
            value={
              connectionHealthQuery.data?.latencyMs !== undefined
                ? `${Math.round(connectionHealthQuery.data.latencyMs)} ms`
                : messages.common.unknown()
            }
          />
          <SummaryCard
            label={messages.overview.memoryUsage()}
            value={memStats ? formatBytes(memStats.HeapAlloc, locale) : messages.common.unknown()}
            className="col-span-1 xl:col-span-1"
          />
          <SummaryCard
            label={messages.overview.currentEndpoint()}
            value={<span className="block truncate">{endpointLabel}</span>}
            className="col-span-2 xl:col-span-2"
          />
        </div>

        <Card className="app-surface-muted">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="text-sm font-medium leading-5 text-[color:var(--app-text)]">{messages.overview.throughput()}</div>
                <div className="flex items-baseline gap-2 text-right">
                  <div className="text-sm font-medium text-[color:var(--app-text-soft)]">
                    {messages.overview.currentThroughput()}
                  </div>
                  <div className="text-base font-bold text-[color:var(--app-text)]">
                    {formatBytes(currentThroughput, locale)}/s
                  </div>
                </div>
              </div>
              <ThroughputChart
                samples={speedHistory}
                refreshMs={statsRefreshMs}
                now={chartNow}
                locale={locale}
                agoLabel={messages.overview.ago()}
                nowLabel={messages.overview.now()}
              />
            </div>
          </CardContent>
        </Card>

        <MutationFeedbacks
          configs={[
            {
              key: "reset-stats",
              mutation: resetMutation,
              successTitle: messages.overview.resetStats(),
              successMessage: messages.overview.statsResetSuccess(),
              errorTitle: messages.overview.resetStats(),
            },
          ]}
        />

        <div className="flex items-center justify-between gap-3">
          <div className="text-base font-medium leading-5 text-[color:var(--app-text)]">{messages.overview.statsSummary()}</div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-sm font-medium text-[color:var(--app-text-soft)] hover:text-[color:var(--app-text)]"
            onClick={handleReset}
            disabled={resetMutation.isPending}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {messages.overview.resetStats()}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          <SummaryCard label={messages.overview.elapsedTime()} value={formatElapsedTime(overviewStats?.elapsedTime, locale)} />
          <SummaryCard label={messages.overview.activeTransfers()} value={activeTransfers} />
          <SummaryCard label={messages.overview.completedTransfers()} value={overviewStats?.transfers ?? 0} />
          <SummaryCard label={messages.overview.transferredBytes()} value={formatBytes(overviewStats?.bytes, locale)} />
          <SummaryCard label={messages.overview.errorCount()} value={overviewStats?.errors ?? 0} />
          <SummaryCard label={messages.overview.deletes()} value={overviewStats?.deletes ?? 0} />
        </div>

        <Card className="app-surface-muted">
          <CardContent className="p-4">
            <div className="flex flex-col gap-2">
              <div
                className={cn(
                  "text-sm font-medium leading-5 text-[color:var(--app-text-soft)]",
                )}
              >
                {messages.overview.latestGlobalError()}
              </div>
              {globalStats?.lastError ? (
                <p className="text-sm text-[color:var(--app-text)]">{globalStats.lastError}</p>
              ) : (
                <p className="text-sm text-[color:var(--app-text-soft)]">
                  {messages.overview.noRecentErrors()}{" "}
                  {messages.overview.noRecentErrorsDetail(<InlineCode>core/stats(group=global_stats).lastError</InlineCode>)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {statsQuery.error ? <QueryErrorAlert title={messages.overview.failedToLoadStats()} error={statsQuery.error} /> : null}
        {remotesQuery.error ? <QueryErrorAlert title={messages.overview.failedToLoadRemotes()} error={remotesQuery.error} /> : null}
      </div>
    </PageShell>
  )
}

export { OverviewPage }
