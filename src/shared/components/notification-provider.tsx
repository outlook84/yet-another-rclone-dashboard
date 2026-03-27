import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PropsWithChildren,
} from "react"
import { X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { useI18n } from "@/shared/i18n"

type NotificationColor = "red" | "green" | "yellow"

interface NotificationInput {
  title: string
  message: string
  color: NotificationColor
}

interface NotificationItem extends NotificationInput {
  id: number
}

type NotifyFn = (input: NotificationInput) => void

const NotificationContext = createContext<NotifyFn | null>(null)

const containerStyle: CSSProperties = {
  position: "fixed",
  top: 16,
  right: 16,
  width: "min(360px, calc(100vw - 32px))",
  zIndex: 400,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  pointerEvents: "none",
}

function getToastStyle(color: NotificationColor): CSSProperties {
  const palette =
    color === "red"
      ? {
          background: "var(--app-danger-bg)",
          border: "var(--app-danger-border)",
          title: "var(--app-danger-text-strong)",
          text: "var(--app-danger-text)",
        }
      : color === "yellow"
        ? {
            background: "var(--app-warning-bg)",
            border: "var(--app-warning-border)",
            title: "var(--app-warning-text)",
            text: "var(--app-warning-text)",
          }
        : {
            background: "var(--app-success-bg)",
            border: "var(--app-success-border)",
            title: "var(--app-success-text)",
            text: "var(--app-text)",
          }

  return {
    background: palette.background,
    border: `1px solid ${palette.border}`,
    borderRadius: 12,
    boxShadow: "var(--app-shadow)",
    padding: 14,
    pointerEvents: "auto",
  }
}

function NotificationProvider({ children }: PropsWithChildren) {
  const { messages } = useI18n()
  const timeoutIdsRef = useRef<Map<number, number>>(new Map())
  const [items, setItems] = useState<NotificationItem[]>([])

  const dismiss = useCallback((id: number) => {
    const timeoutId = timeoutIdsRef.current.get(id)

    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
      timeoutIdsRef.current.delete(id)
    }

    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback<NotifyFn>(
    ({ title, message, color }) => {
      const id = Date.now() + Math.floor(Math.random() * 1000)
      setItems((current) => [...current, { id, title, message, color }])

      const timeoutId = window.setTimeout(() => dismiss(id), 4000)
      timeoutIdsRef.current.set(id, timeoutId)
    },
    [dismiss],
  )

  const value = useMemo(() => notify, [notify])

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div style={containerStyle} aria-live="polite" aria-atomic="true">
        {items.map((item) => (
          <div key={item.id} style={getToastStyle(item.color)}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: getToastStyle(item.color).border
                      ? item.color === "red"
                        ? "var(--app-danger-text-strong)"
                        : item.color === "yellow"
                          ? "var(--app-warning-text)"
                          : "var(--app-success-text)"
                      : "var(--app-text)",
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    lineHeight: 1.45,
                    color:
                      item.color === "red"
                        ? "var(--app-danger-text)"
                        : item.color === "yellow"
                          ? "var(--app-warning-text)"
                          : "var(--app-text)",
                  }}
                >
                  {item.message}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-[8px] p-0 text-[color:var(--app-text-soft)]"
                onClick={() => dismiss(item.id)}
                aria-label={messages.common.dismissNotification()}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

function useNotify() {
  const value = useContext(NotificationContext)

  if (!value) {
    throw new Error("NotificationProvider is missing from the component tree")
  }

  return value
}

// eslint-disable-next-line react-refresh/only-export-components
export { NotificationProvider, useNotify }
