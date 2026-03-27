import { useEffect } from "react"
import { useNotify } from "@/shared/components/notification-provider"
import { useI18n } from "@/shared/i18n"
import { toErrorMessage } from "@/shared/lib/error-utils"

interface MutationFeedbackItem {
  color: "red" | "green" | "yellow"
  title: string
  message: string
}

interface MutationState {
  isSuccess?: boolean
  error?: unknown
}

interface MutationFeedbackConfig {
  key: string
  mutation: MutationState
  successTitle?: string
  successMessage?: string
  errorTitle: string
  defaultErrorMessage?: string
}

function MutationFeedbackItemListener({
  title,
  message,
  color,
}: {
  title?: string
  message?: string
  color?: "red" | "green" | "yellow"
}) {
  const notify = useNotify()

  useEffect(() => {
    if (!title || !message || !color) {
      return
    }

    notify({ title, message, color })
  }, [color, message, notify, title])

  return null
}

function MutationFeedbacks({ configs }: { configs: MutationFeedbackConfig[] }) {
  const { messages } = useI18n()

  const items = configs.map<MutationFeedbackItem | null>((config) => {
    if (config.mutation.error) {
      return {
        color: "red",
        title: config.errorTitle,
        message: toErrorMessage(
          config.mutation.error,
          messages.common,
          config.defaultErrorMessage,
        ),
      }
    }

    if (config.mutation.isSuccess && config.successTitle && config.successMessage) {
      return {
        color: "green",
        title: config.successTitle,
        message: config.successMessage,
      }
    }

    return null
  })

  return (
    <>
      {items.map((item, index) => (
        <MutationFeedbackItemListener
          key={configs[index].key}
          title={item?.title}
          message={item?.message}
          color={item?.color}
        />
      ))}
    </>
  )
}

export { MutationFeedbacks }
