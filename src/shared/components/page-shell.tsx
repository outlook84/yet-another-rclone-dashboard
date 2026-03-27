import type { CSSProperties, PropsWithChildren, ReactNode } from "react"
import { Badge } from "@/shared/components/ui/badge"
import { useI18n } from "@/shared/i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { cn } from "@/shared/lib/cn"

interface PageShellProps extends PropsWithChildren {
  title: string
  description?: string
  headerContent?: ReactNode
  hideBadge?: boolean
  titleContent?: ReactNode
  contentStyle?: CSSProperties
  hideHeader?: boolean
  bareContent?: boolean
}

function PageShell({
  title,
  description,
  headerContent,
  hideBadge = false,
  titleContent,
  contentStyle,
  hideHeader = false,
  bareContent = false,
  children,
}: PageShellProps) {
  const { messages } = useI18n()

  return (
    <div className="app-page-stack">
      {!hideHeader ? (
        <Card className="app-surface-elevated">
          <CardHeader className="gap-1.5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {!hideBadge ? (
                  <Badge className="mb-2">
                    {messages.common.section()}
                  </Badge>
                ) : null}
                {titleContent ?? <CardTitle className="app-page-title">{title}</CardTitle>}
                {description ? (
                  <CardDescription className="mt-1 max-w-[720px] text-[13px]">
                    {description}
                  </CardDescription>
                ) : null}
              </div>
              {headerContent ? <div className="min-w-[220px] max-w-[420px] flex-1">{headerContent}</div> : null}
            </div>
          </CardHeader>
        </Card>
      ) : null}

      {bareContent ? (
        <div style={contentStyle}>{children}</div>
      ) : (
        <Card className={cn("app-surface-elevated-soft", contentStyle ? "" : undefined)} style={contentStyle}>
          <CardContent className="p-4">{children}</CardContent>
        </Card>
      )}
    </div>
  )
}

export { PageShell }
