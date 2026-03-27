import { useMutation } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"

interface ExplorerPublicLinkInput {
  remote: string
  path: string
}

function useExplorerPublicLinkMutation() {
  const api = useAppApi()

  return useMutation({
    mutationFn: async ({ remote, path }: ExplorerPublicLinkInput) => {
      if (!api.explorer.publicLink) {
        throw new Error("Share link is not available on the current backend adapter")
      }

      return api.explorer.publicLink({ remote, path })
    },
  })
}

export { useExplorerPublicLinkMutation }
