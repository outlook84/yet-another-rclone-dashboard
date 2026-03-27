import { Link } from "react-router-dom"
import { Button } from "@/shared/components/ui/button"
import { useI18n } from "@/shared/i18n"

function NotFoundPage() {
  const { messages } = useI18n()

  return (
    <div className="flex flex-col gap-3">
      <h2 className="app-page-title">{messages.notFound.title()}</h2>
      <p className="text-sm text-[color:var(--app-text-soft)]">
        {messages.notFound.description()}
      </p>
      <div>
        <Button asChild>
          <Link to="/">{messages.notFound.backToConnect()}</Link>
        </Button>
      </div>
    </div>
  )
}

export { NotFoundPage }
