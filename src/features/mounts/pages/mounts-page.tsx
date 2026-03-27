import { IconFolderSymlink } from "@tabler/icons-react"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { useCreateMountMutation } from "@/features/mounts/api/use-create-mount-mutation"
import { PageShell } from "@/shared/components/page-shell"
import { MutationFeedbacks } from "@/shared/components/mutation-feedbacks"
import { QueryErrorAlert } from "@/shared/components/query-error-alert"
import { useMountsQuery } from "@/features/mounts/api/use-mounts-query"
import { useUnmountMutation } from "@/features/mounts/api/use-unmount-mutation"
import { useUnmountAllMutation } from "@/features/mounts/api/use-unmount-all-mutation"
import { useConfirm } from "@/shared/components/confirm-provider"
import { useI18n } from "@/shared/i18n"
import { inputExamples, resolveInputExample } from "@/shared/i18n/input-examples"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { InlineCode } from "@/shared/components/ui/inline-code"
import { Table, TableCell, TableHead, TableHeadRow, TableRow, TableScroll, TableShell } from "@/shared/components/ui/table"

function MountsPage() {
  const { locale, messages } = useI18n()
  const [fs, setFs] = useState("")
  const [mountPoint, setMountPoint] = useState("")
  const [mountType, setMountType] = useState("")
  const mountsQuery = useMountsQuery()
  const createMountMutation = useCreateMountMutation()
  const unmountMutation = useUnmountMutation()
  const unmountAllMutation = useUnmountAllMutation()
  const confirm = useConfirm()
  const mountsMark = (
    <div className="flex items-center gap-3" style={{ minHeight: 56 }}>
      <div
        aria-label={messages.mounts.title()}
        title={messages.mounts.title()}
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          display: "grid",
          placeItems: "center",
          background: "var(--app-chart-bg)",
          border: "1px solid var(--app-border)",
          boxShadow: "var(--app-shadow-soft)",
        }}
      >
        <IconFolderSymlink size={28} stroke={1.8} color="var(--app-accent)" />
      </div>
      <span className="text-xl font-bold leading-none text-[color:var(--app-text)]">
        {messages.mounts.title()}
      </span>
    </div>
  )

  return (
    <PageShell
      title={messages.mounts.title()}
      hideBadge
      titleContent={mountsMark}
    >
      <div className="flex flex-col gap-4">
        {mountsQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-[color:var(--app-text-soft)]" /> : null}
        {mountsQuery.error ? (
          <QueryErrorAlert title={messages.mounts.failedToLoadMounts()} error={mountsQuery.error} />
        ) : null}
        <MutationFeedbacks
          configs={[
            {
              key: "create-mount",
              mutation: createMountMutation,
              successTitle: messages.mounts.mountCreated(),
              successMessage: messages.mounts.mountCreatedMessage(),
              errorTitle: messages.mounts.createMountFailed(),
            },
            {
              key: "unmount",
              mutation: unmountMutation,
              successTitle: messages.mounts.unmounted(),
              successMessage: messages.mounts.unmountedMessage(),
              errorTitle: messages.mounts.unmountFailed(),
            },
            {
              key: "unmount-all",
              mutation: unmountAllMutation,
              successTitle: messages.mounts.allMountsUnmounted(),
              successMessage: messages.mounts.allMountsUnmountedMessage(),
              errorTitle: messages.mounts.unmountAllFailed(),
            },
          ]}
        />

        <div className="flex flex-col gap-3">
          <h4 className="app-section-title">{messages.mounts.createMount()}</h4>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-sm font-medium text-[color:var(--app-text-soft)]">{messages.mounts.fs()}</span>
              <Input
                placeholder={resolveInputExample(inputExamples.remoteFs, locale)}
                value={fs}
                onChange={(event) => setFs(event.currentTarget.value)}
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-sm font-medium text-[color:var(--app-text-soft)]">{messages.mounts.mountPoint()}</span>
              <Input
                placeholder={resolveInputExample(inputExamples.mountPoint, locale)}
                value={mountPoint}
                onChange={(event) => setMountPoint(event.currentTarget.value)}
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-sm font-medium text-[color:var(--app-text-soft)]">{messages.mounts.mountType()}</span>
              <Input
                placeholder={messages.mounts.optional()}
                value={mountType}
                onChange={(event) => setMountType(event.currentTarget.value)}
              />
            </label>
            <Button
              disabled={!fs.trim() || !mountPoint.trim() || createMountMutation.isPending}
              onClick={async () => {
                await createMountMutation.mutateAsync({
                  fs: fs.trim(),
                  mountPoint: mountPoint.trim(),
                  mountType: mountType.trim() || undefined,
                })
                setFs("")
                setMountPoint("")
                setMountType("")
              }}
            >
              {createMountMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              {messages.mounts.createMountButton()}
            </Button>
          </div>
          <p className="text-xs text-[color:var(--app-text-soft)]">
            {messages.mounts.deferredOptionsNote(<InlineCode>rclone mount</InlineCode>)}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="app-section-title">{messages.mounts.activeMounts()}</h4>
          <Button
            variant="danger"
            size="sm"
            disabled={!mountsQuery.data?.length || unmountAllMutation.isPending}
            onClick={async () => {
              const confirmed = await confirm({
                title: messages.mounts.unmountAllTitle(),
                message: messages.mounts.unmountAllMessage(),
                confirmLabel: messages.mounts.unmountAll(),
              })
              if (!confirmed) {
                return
              }
              await unmountAllMutation.mutateAsync()
            }}
          >
            {unmountAllMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {messages.mounts.unmountAll()}
          </Button>
        </div>
        {mountsQuery.data ? (
          mountsQuery.data.length > 0 ? (
            <TableShell>
              <TableScroll>
                <Table>
                  <thead>
                    <TableHeadRow>
                      <TableHead>{messages.mounts.mountPoint()}</TableHead>
                      <TableHead>{messages.mounts.fs()}</TableHead>
                      <TableHead>{messages.mounts.mountType()}</TableHead>
                      <TableHead>{messages.mounts.actions()}</TableHead>
                    </TableHeadRow>
                  </thead>
                  <tbody>
                    {mountsQuery.data.map((mount) => (
                      <TableRow key={mount.mountPoint}>
                        <TableCell>{mount.mountPoint}</TableCell>
                        <TableCell>{mount.fs || "-"}</TableCell>
                        <TableCell>{mount.mountType ?? "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="danger"
                            size="xs"
                            disabled={
                              unmountMutation.isPending &&
                              unmountMutation.variables === mount.mountPoint
                            }
                            onClick={async () => {
                              const confirmed = await confirm({
                                title: messages.mounts.unmountMount(),
                                message: messages.mounts.unmountMountMessage(mount.mountPoint),
                                confirmLabel: messages.mounts.unmount(),
                              })
                              if (!confirmed) {
                                return
                              }
                              await unmountMutation.mutateAsync(mount.mountPoint)
                            }}
                          >
                            {unmountMutation.isPending &&
                            unmountMutation.variables === mount.mountPoint ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : null}
                            {messages.mounts.unmount()}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </TableScroll>
            </TableShell>
          ) : (
            <p className="text-sm text-[color:var(--app-text-soft)]">{messages.mounts.noActiveMounts()}</p>
          )
        ) : null}
      </div>
    </PageShell>
  )
}

export { MountsPage }
