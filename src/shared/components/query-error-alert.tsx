import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { useI18n } from "@/shared/i18n"
import { toErrorMessage } from "@/shared/lib/error-utils"

interface QueryErrorAlertProps {
  title: string
  error: unknown
  color?: "red" | "yellow"
}

function QueryErrorAlert({ title, error, color = "red" }: QueryErrorAlertProps) {
  const { messages } = useI18n()

  return (
    <Alert variant={color === "yellow" ? "warning" : "error"}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{toErrorMessage(error, messages.common)}</AlertDescription>
    </Alert>
  )
}

export { QueryErrorAlert }
