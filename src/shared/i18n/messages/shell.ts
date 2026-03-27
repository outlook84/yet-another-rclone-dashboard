import type { AppMessages, MessageSet } from "@/shared/i18n/messages/types"

const appMessages: MessageSet<AppMessages["app"]> = {
  en: {
    shortName: () => "YARD",
    fullName: () => "Yet Another Rclone Dashboard",
    versionLabel: () => "YARD",
    rcloneVersionLabel: () => "Rclone",
  },
  "zh-CN": {
    shortName: () => "YARD",
    fullName: () => "Yet Another Rclone Dashboard",
    versionLabel: () => "YARD",
    rcloneVersionLabel: () => "Rclone",
  },
}

const navMessages: MessageSet<AppMessages["nav"]> = {
  en: {
    overview: () => "Overview",
    overviewHint: () => "Status",
    remotes: () => "Remotes",
    remotesHint: () => "Backends",
    explorer: () => "Explorer",
    explorerHint: () => "Files",
    jobs: () => "Transfers",
    jobsHint: () => "Transfer Activity",
    settings: () => "Settings",
    settingsHint: () => "Runtime",
    connect: () => "Connect",
    connectHint: () => "RC link",
    openNavigation: () => "Open navigation",
    statsRefreshInterval: () => "Stats refresh interval",
    refreshingStats: () => "Refreshing stats",
  },
  "zh-CN": {
    overview: () => "概览",
    overviewHint: () => "运行状态",
    remotes: () => "存储",
    remotesHint: () => "配置管理",
    explorer: () => "文件",
    explorerHint: () => "文件管理",
    jobs: () => "任务",
    jobsHint: () => "传输活动",
    settings: () => "设置",
    settingsHint: () => "运行参数",
    connect: () => "连接",
    connectHint: () => "RC 端点",
    openNavigation: () => "打开导航",
    statsRefreshInterval: () => "统计刷新间隔",
    refreshingStats: () => "正在刷新统计",
  },
}

const connectionMessages: MessageSet<AppMessages["connection"]> = {
  en: {
    notVerified: () => "Not Verified",
    retrying: (count, max) => `Retrying (${count}/${max})`,
    checking: () => "Checking",
    connected: () => "Connected",
  },
  "zh-CN": {
    notVerified: () => "未验证",
    retrying: (count, max) => `重试中 (${count}/${max})`,
    checking: () => "检查中",
    connected: () => "已连接",
  },
}

const themeMessages: MessageSet<AppMessages["theme"]> = {
  en: {
    label: () => "Theme",
    system: () => "System",
    light: () => "Light",
    dark: () => "Dark",
    vivid: () => "Vivid",
    systemDescription: () => "Follow device appearance",
    lightDescription: () => "Always use the bright theme",
    darkDescription: () => "Always use the dark theme",
    triggerLabel: (label) => `Theme: ${label}`,
  },
  "zh-CN": {
    label: () => "主题",
    system: () => "系统",
    light: () => "浅色",
    dark: () => "深色",
    vivid: () => "活力",
    systemDescription: () => "跟随设备外观",
    lightDescription: () => "始终使用浅色主题",
    darkDescription: () => "始终使用深色主题",
    triggerLabel: (label) => `主题：${label}`,
  },
}

export { appMessages, connectionMessages, navMessages, themeMessages }
