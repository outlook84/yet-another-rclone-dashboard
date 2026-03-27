import { commonMessages } from "@/shared/i18n/messages/common"
import { connectMessages } from "@/shared/i18n/messages/connect"
import { explorerMessages } from "@/shared/i18n/messages/explorer"
import { jobsMessages } from "@/shared/i18n/messages/jobs"
import { mountsMessages } from "@/shared/i18n/messages/mounts"
import { overviewMessages } from "@/shared/i18n/messages/overview"
import { remotesMessages } from "@/shared/i18n/messages/remotes"
import { appMessages, connectionMessages, navMessages, themeMessages } from "@/shared/i18n/messages/shell"
import { notFoundMessages, settingsMessages } from "@/shared/i18n/messages/settings"
import type { AppMessages } from "@/shared/i18n/messages/types"

const messages: Record<"en" | "zh-CN", AppMessages> = {
  en: {
    common: commonMessages.en,
    app: appMessages.en,
    nav: navMessages.en,
    connection: connectionMessages.en,
    theme: themeMessages.en,
    connect: connectMessages.en,
    overview: overviewMessages.en,
    mounts: mountsMessages.en,
    remotes: remotesMessages.en,
    jobs: jobsMessages.en,
    explorer: explorerMessages.en,
    settings: settingsMessages.en,
    notFound: notFoundMessages.en,
  },
  "zh-CN": {
    common: commonMessages["zh-CN"],
    app: appMessages["zh-CN"],
    nav: navMessages["zh-CN"],
    connection: connectionMessages["zh-CN"],
    theme: themeMessages["zh-CN"],
    connect: connectMessages["zh-CN"],
    overview: overviewMessages["zh-CN"],
    mounts: mountsMessages["zh-CN"],
    remotes: remotesMessages["zh-CN"],
    jobs: jobsMessages["zh-CN"],
    explorer: explorerMessages["zh-CN"],
    settings: settingsMessages["zh-CN"],
    notFound: notFoundMessages["zh-CN"],
  },
}

export type { AppMessages }
export { messages }
