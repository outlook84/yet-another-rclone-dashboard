import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react"
import { Button } from "@/shared/components/ui/button"
import { useI18n } from "@/shared/i18n"

interface ConfirmOptions {
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: string
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)



function ConfirmProvider({ children }: PropsWithChildren) {
  const { messages } = useI18n()
  const resolverRef = useRef<((value: boolean) => void) | null>(null)
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: "",
    message: "",
    confirmLabel: messages.common.confirm(),
    cancelLabel: messages.common.cancel(),
    confirmColor: "red",
  })

  const closeWithResult = useCallback((value: boolean) => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setState((current) => ({
      ...current,
      open: false,
    }))
  }, [])

  const confirm = useCallback<ConfirmFn>((options) => {
    setState({
      open: true,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? messages.common.confirm(),
      cancelLabel: options.cancelLabel ?? messages.common.cancel(),
      confirmColor: options.confirmColor ?? "red",
    })

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [messages.common])

  const value = useMemo(() => confirm, [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state.open ? (
        <div onClick={() => closeWithResult(false)} className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(15,23,42,0.45)] p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={state.title}
            className="w-full max-w-[480px] rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-elevated)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.2)] backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-lg font-bold text-[color:var(--app-text)]">{state.title}</div>
            <div className="mt-3 text-sm leading-relaxed text-[color:var(--app-text-soft)]">
              {state.message}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button size="sm" variant="secondary" onClick={() => closeWithResult(false)}>
                {state.cancelLabel}
              </Button>
              <Button
                size="sm"
                variant={state.confirmColor === "red" ? "danger" : state.confirmColor === "yellow" ? "secondary" : "default"}
                onClick={() => closeWithResult(true)}
              >
                {state.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  )
}

function useConfirm() {
  const value = useContext(ConfirmContext)

  if (!value) {
    throw new Error("ConfirmProvider is missing from the component tree")
  }

  return value
}

// eslint-disable-next-line react-refresh/only-export-components
export { ConfirmProvider, useConfirm }
