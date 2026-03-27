import { useIsFetching } from "@tanstack/react-query"
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react"
import { Link, Navigate, Outlet, useLocation, useNavigationType } from "react-router-dom"
import {
  BriefcaseBusiness,
  ChevronDown,
  Folder,
  House,
  Languages,
  Loader2,
  LogIn,
  Menu,
  Palette,
  Server,
  SlidersHorizontal,
  TimerReset,
  X,
} from "lucide-react"
import { useStatsPollingStore } from "@/features/jobs/store/stats-polling-store"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { NativeSelect } from "@/shared/components/ui/native-select"
import { cn } from "@/shared/lib/cn"
import { queryKeys } from "@/shared/lib/query-keys"
import { useConnectionHealthQuery } from "@/shared/hooks/use-connection-health-query"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { useI18n } from "@/shared/i18n"
import { useConnectionStore } from "@/shared/store/connection-store"
import { useLastVisitedRouteStore } from "@/shared/store/last-visited-route-store"
import { usePageChromeStore } from "@/shared/store/page-chrome-store"
import { useThemeStore } from "@/shared/store/theme-store"
import packageJson from "../../../package.json"

const MAX_CONSECUTIVE_CONNECTION_FAILURES = 3

const routePreloaders: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/features/auth/pages/connect-page"),
  "/overview": () => import("@/features/overview/pages/overview-page"),
  "/remotes": () => import("@/features/remotes/pages/remotes-page"),
  "/explorer": () => import("@/features/explorer/pages/explorer-page"),
  "/jobs": () => import("@/features/jobs/pages/jobs-page"),
  "/settings": () => import("@/features/settings/pages/settings-page"),
}

function preloadRoute(path: string) {
  const load = routePreloaders[path]
  if (!load) {
    return
  }

  void load()
}

function preloadKnownRoutes() {
  Object.values(routePreloaders).forEach((load) => {
    void load()
  })
}

function createHeldSpinnerStore(initiallyVisible: boolean) {
  let visible = initiallyVisible
  let lastStartedAt = initiallyVisible ? Date.now() : 0
  let hideTimer: number | null = null
  const listeners = new Set<() => void>()

  const emit = () => {
    listeners.forEach((listener) => listener())
  }

  const clearHideTimer = () => {
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  return {
    getSnapshot: () => visible,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    start: () => {
      clearHideTimer()
      lastStartedAt = Date.now()
      if (!visible) {
        visible = true
        emit()
      }
    },
    stop: (holdMs: number) => {
      clearHideTimer()
      const remainingMs = Math.max(lastStartedAt + holdMs - Date.now(), 0)

      if (remainingMs === 0) {
        if (visible) {
          visible = false
          emit()
        }
        return
      }

      hideTimer = window.setTimeout(() => {
        hideTimer = null
        if (visible) {
          visible = false
          emit()
        }
      }, remainingMs)
    },
    cleanup: () => {
      clearHideTimer()
      listeners.clear()
    },
  }
}

function createConnectionFailureStore() {
  let consecutiveFailures = 0
  let lastHandledSuccessAt = 0
  let lastHandledErrorAt = 0
  const listeners = new Set<() => void>()

  const emit = () => {
    listeners.forEach((listener) => listener())
  }

  return {
    getSnapshot: () => consecutiveFailures,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    sync: (input: {
      isValidated: boolean
      dataUpdatedAt: number
      errorUpdatedAt: number
    }) => {
      let changed = false

      if (!input.isValidated) {
        if (consecutiveFailures !== 0 || lastHandledSuccessAt !== 0 || lastHandledErrorAt !== 0) {
          consecutiveFailures = 0
          lastHandledSuccessAt = 0
          lastHandledErrorAt = 0
          changed = true
        }
      } else {
        if (input.dataUpdatedAt > 0 && input.dataUpdatedAt !== lastHandledSuccessAt) {
          lastHandledSuccessAt = input.dataUpdatedAt
          if (consecutiveFailures !== 0) {
            consecutiveFailures = 0
            changed = true
          }
        }

        if (input.errorUpdatedAt > 0 && input.errorUpdatedAt !== lastHandledErrorAt) {
          lastHandledErrorAt = input.errorUpdatedAt
          consecutiveFailures += 1
          changed = true
        }
      }

      if (changed) {
        emit()
      }
    },
    cleanup: () => {
      listeners.clear()
    },
  }
}

function useConsecutiveConnectionFailures(input: {
  isValidated: boolean
  dataUpdatedAt: number
  errorUpdatedAt: number
}) {
  const [store] = useState(createConnectionFailureStore)
  const consecutiveFailures = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  )

  useEffect(() => {
    store.sync(input)
  }, [input, store])

  useEffect(() => {
    return () => {
      store.cleanup()
    }
  }, [store])

  return consecutiveFailures
}

function useHeldSpinner(active: boolean, holdMs: number) {
  const [store] = useState(() => createHeldSpinnerStore(active))

  const visible = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  )

  useEffect(() => {
    if (active) {
      store.start()
      return
    }

    store.stop(holdMs)
  }, [active, holdMs, store])

  useEffect(() => {
    return () => {
      store.cleanup()
    }
  }, [store])

  return active || visible
}

function RootLayout() {
  const { locale, setLocale, messages } = useI18n()
  const location = useLocation()
  const navigationType = useNavigationType()
  const [opened, setOpened] = useState(false)
  const [mobileNavExtrasReady, setMobileNavExtrasReady] = useState(false)
  const lastValidatedAt = useConnectionStore((state) => state.lastValidatedAt)
  const lastServerInfo = useConnectionStore((state) => state.lastServerInfo)
  const clearValidation = useConnectionStore((state) => state.clearValidation)
  const headerContent = usePageChromeStore((state) => state.headerContent)
  const statsPollingIntervalMs = useStatsPollingStore((state) => state.intervalMs)
  const setStatsPollingIntervalMs = useStatsPollingStore((state) => state.setIntervalMs)
  const themeMode = useThemeStore((state) => state.mode)
  const setThemeMode = useThemeStore((state) => state.setMode)
  const connectionScope = useConnectionScope()
  const setLastVisitedRoute = useLastVisitedRouteStore((state) => state.setLastVisitedRoute)
  const getLastVisitedRoute = useLastVisitedRouteStore((state) => state.getLastVisitedRoute)
  const isValidated = Boolean(lastValidatedAt && lastServerInfo)
  const requiresConnection = location.pathname !== "/"
  const activeStatsFetches = useIsFetching({
    queryKey: queryKeys.combinedStats(connectionScope),
  })
  const hasPrefetchedRoutesRef = useRef(false)
  const appVersion = packageJson.version
  const statsPollingOptions = useMemo(
    () => [
      { value: "1000", label: "1s" },
      { value: "3000", label: "3s" },
      { value: "5000", label: "5s" },
      { value: "10000", label: "10s" },
      { value: "0", label: messages.common.off() },
    ],
    [messages.common],
  )
  const navItems = useMemo(
    () => [
      { to: "/overview", label: messages.nav.overview(), hint: messages.nav.overviewHint(), icon: House },
      { to: "/remotes", label: messages.nav.remotes(), hint: messages.nav.remotesHint(), icon: Server },
      { to: "/explorer", label: messages.nav.explorer(), hint: messages.nav.explorerHint(), icon: Folder },
      { to: "/jobs", label: messages.nav.jobs(), hint: messages.nav.jobsHint(), icon: BriefcaseBusiness },
      { to: "/settings", label: messages.nav.settings(), hint: messages.nav.settingsHint(), icon: SlidersHorizontal },
      { to: "/", label: messages.nav.connect(), hint: messages.nav.connectHint(), icon: LogIn },
    ],
    [messages.nav],
  )
  const currentNavItem = useMemo(
    () => navItems.find((item) => item.to === location.pathname) ?? null,
    [location.pathname, navItems],
  )
  const connectionHealthQuery = useConnectionHealthQuery()
  const consecutiveFailures = useConsecutiveConnectionFailures({
    isValidated,
    dataUpdatedAt: connectionHealthQuery.dataUpdatedAt,
    errorUpdatedAt: connectionHealthQuery.errorUpdatedAt,
  })
  const closeMobileNav = () => {
    setMobileNavExtrasReady(false)
    setOpened(false)
  }

  const openMobileNav = () => {
    setMobileNavExtrasReady(false)
    setOpened(true)
  }

  useEffect(() => {
    if (isValidated && consecutiveFailures >= MAX_CONSECUTIVE_CONNECTION_FAILURES) {
      clearValidation()
    }
  }, [clearValidation, consecutiveFailures, isValidated])

  useEffect(() => {
    if (!isValidated || hasPrefetchedRoutesRef.current) {
      return
    }

    hasPrefetchedRoutesRef.current = true
    const preloadTimer = window.setTimeout(() => {
      preloadKnownRoutes()
    }, 0)

    return () => {
      window.clearTimeout(preloadTimer)
    }
  }, [isValidated])

  useEffect(() => {
    if (!isValidated || location.pathname === "/") {
      return
    }

    setLastVisitedRoute(connectionScope, location.pathname)
  }, [connectionScope, isValidated, location.pathname, setLastVisitedRoute])

  useEffect(() => {
    if (!opened) {
      return
    }

    const timer = window.setTimeout(() => {
      setMobileNavExtrasReady(true)
    }, 120)

    return () => {
      window.clearTimeout(timer)
    }
  }, [opened])

  const connectionBadgeLabel = !isValidated
    ? messages.connection.notVerified()
    : consecutiveFailures > 0
      ? messages.connection.retrying(consecutiveFailures, MAX_CONSECUTIVE_CONNECTION_FAILURES)
      : connectionHealthQuery.isPending
        ? messages.connection.checking()
        : messages.connection.connected()
  const isStatsRefreshing = activeStatsFetches > 0
  const showStatsRefreshSpinner = useHeldSpinner(isStatsRefreshing, 650)

  if (!isValidated && requiresConnection) {
    return <Navigate to="/" replace state={{ redirectedFrom: location.pathname }} />
  }

  if (
    isValidated &&
    location.pathname === "/" &&
    navigationType === "POP" &&
    location.state?.manualConnect !== true
  ) {
    return <Navigate to={getLastVisitedRoute(connectionScope)} replace />
  }

  const navLinks = (
    <div className="app-nav">
      {navItems.map((item) => {
        const active = location.pathname === item.to
        const navLabelClassName = "font-medium"

        return (
            <Link
            key={item.to}
            to={item.to}
            state={item.to === "/" ? { manualConnect: true } : undefined}
            onClick={closeMobileNav}
            onMouseEnter={() => preloadRoute(item.to)}
            onFocus={() => preloadRoute(item.to)}
            className={cn(
              "app-nav-item group",
              active
                ? "border-[color:var(--sidebar-item-active-border)] bg-[color:var(--sidebar-item-active-bg)] text-[color:var(--sidebar-item-active-text)]"
                : "border-transparent bg-transparent text-[color:var(--sidebar-item-text)] hover:border-[color:var(--app-border)] hover:bg-[color:var(--app-hover-surface)]",
            )}
            style={{
              borderLeftWidth: 3,
              borderLeftColor: active ? "var(--sidebar-item-active-rail)" : "transparent",
            }}
          >
            <item.icon
              className="app-nav-icon"
              size={20}
              strokeWidth={2}
              color={active ? "var(--sidebar-item-active-icon)" : "var(--sidebar-item-icon)"}
            />
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "truncate text-sm leading-5",
                  navLabelClassName,
                  active ? "text-[color:var(--sidebar-item-active-text)]" : "text-[color:var(--sidebar-item-text)]",
                )}
              >
                {item.label}
              </div>
              <div
                className={cn(
                  "mt-1 truncate text-xs leading-5",
                  active
                    ? "text-[color:var(--sidebar-item-active-text-soft)]"
                    : "text-[color:var(--sidebar-item-text-soft)]",
                )}
              >
                {item.hint}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )

  const navExtras = (
    <>
      <div className="mt-4 border-t border-[color:var(--app-border)] pt-4">
        <div className="px-1">
          <div className="flex items-center gap-2">
            <Palette className="h-[24px] w-[24px]" />
            <NativeSelect
              value={themeMode}
              className="h-9 text-xs font-normal"
              aria-label={messages.settings.appearance()}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                const value = event.currentTarget.value
                if (value === "system" || value === "light" || value === "dark" || value === "vivid") {
                  setThemeMode(value)
                }
              }}
            >
              <option value="system">{messages.theme.system()}</option>
              <option value="light">{messages.theme.light()}</option>
              <option value="dark">{messages.theme.dark()}</option>
              <option value="vivid">{messages.theme.vivid()}</option>
            </NativeSelect>
          </div>
        </div>
        <div className="mt-4 px-1">
          <div className="flex items-center gap-2">
            <Languages className="h-[24px] w-[24px]" />
            <NativeSelect
              value={locale}
              className="h-9 text-xs font-normal"
              aria-label={messages.settings.language()}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setLocale(event.currentTarget.value as typeof locale)}
            >
              <option value="en">{messages.settings.english()}</option>
              <option value="zh-CN">{messages.settings.simplifiedChinese()}</option>
            </NativeSelect>
          </div>
        </div>
      </div>
      <div className="mt-4 border-t border-[color:var(--app-border)] pt-3">
        <div className="space-y-1.5 px-1 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-[color:var(--app-text-soft)]">{messages.app.rcloneVersionLabel()}:</span>
            <span className="font-bold text-[color:var(--app-text)]">
              {lastServerInfo?.version ?? messages.common.unknown()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-[color:var(--app-text-soft)]">{messages.app.versionLabel()}:</span>
            <span className="font-bold text-[color:var(--app-text)]">{appVersion}</span>
          </div>
        </div>
      </div>
    </>
  )

  const navList = (
    <div className="flex h-full flex-col">
      {navLinks}
      {navExtras}
    </div>
  )

  const mobileNavList = (
    <div className="flex h-full flex-col">
      {navLinks}
      {mobileNavExtrasReady ? navExtras : null}
    </div>
  )

  return (
    <div className="min-h-screen bg-transparent">
      <header className="app-shell-topbar sticky top-0 z-40 border-b border-[color:var(--app-border)] bg-[color:var(--app-header-bg)]">
        <div className="app-shell-header mx-auto max-w-[1600px]">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={openMobileNav}
              aria-label={messages.nav.openNavigation()}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden truncate text-sm font-medium text-[color:var(--app-text-soft)] sm:block lg:hidden">
                {messages.app.shortName()}
              </div>
              <div className="hidden truncate text-sm font-medium text-[color:var(--app-text-soft)] lg:block">
                {messages.app.fullName()}
              </div>
              {currentNavItem ? (
                <div className="flex min-w-0 items-center gap-2.5">
                  <currentNavItem.icon size={16} strokeWidth={2} color="var(--app-text)" />
                  <span className="truncate text-sm font-bold text-[color:var(--app-text)]">
                    {currentNavItem.label}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {headerContent ? (
              <div className="hidden min-w-[220px] max-w-[34vw] flex-1 md:block" style={{ width: 304 }}>
                {headerContent}
              </div>
            ) : null}
            {isValidated ? (
              <div
                className="app-stats-refresh-control relative inline-flex h-9 min-w-[86px] shrink-0 items-center gap-2.5 rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-button-secondary-bg)] pl-3 pr-2.5 text-[color:var(--app-text)] transition-colors hover:border-[color:var(--app-interactive-selected-border)] hover:bg-[color:var(--app-button-secondary-hover-bg)]"
                aria-hidden="true"
              >
                {showStatsRefreshSpinner ? (
                  <Loader2
                    className="app-stats-refresh-icon app-stats-refresh-icon--spin-fast h-[17px] w-[17px] shrink-0 animate-spin text-[color:var(--app-text-soft)]"
                    aria-hidden="true"
                  />
                ) : (
                  <TimerReset className="app-stats-refresh-icon h-[17px] w-[17px] shrink-0 text-[color:var(--app-text-soft)]" aria-hidden="true" />
                )}
                <span
                  className="min-w-[28px] text-xs font-medium tabular-nums"
                >
                  {statsPollingOptions.find((option) => Number(option.value) === statsPollingIntervalMs)?.label ?? "5s"}
                </span>
                <ChevronDown
                  className="app-stats-refresh-chevron pointer-events-none absolute right-2.5 h-3.5 w-3.5 shrink-0 text-[color:var(--app-text-soft)]"
                />
                <select
                  value={String(statsPollingIntervalMs)}
                  className="absolute inset-0 cursor-pointer appearance-none rounded-full border-0 bg-transparent opacity-0"
                  aria-label={messages.nav.statsRefreshInterval()}
                  title={isStatsRefreshing ? messages.nav.refreshingStats() : messages.nav.statsRefreshInterval()}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                    setStatsPollingIntervalMs(Number(event.currentTarget.value))
                  }}
                >
                  {statsPollingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <Badge
              variant={
                !isValidated
                  ? "warning"
                  : consecutiveFailures > 0 || connectionHealthQuery.isPending
                    ? "warning"
                    : "success"
              }
              className="inline-flex shrink-0 px-2 py-1 text-[10px] sm:px-2.5 sm:text-[11px]"
            >
              {connectionBadgeLabel}
            </Badge>
          </div>
        </div>
      </header>

      <div className="app-shell-grid">
        <aside className="app-shell-sidebar hidden border-r border-[color:var(--app-border)] md:block">
          <nav className="app-fade-in sticky top-[72px]">{navList}</nav>
        </aside>
        <main className="app-shell-main">
          <div className="app-fade-in mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>

      {opened ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={messages.common.close()}
            className="absolute inset-0 bg-slate-950/40"
            onClick={closeMobileNav}
          />
          <div className="absolute inset-y-0 left-0 w-[280px] overflow-y-auto overscroll-contain border-r border-[color:var(--app-border)] bg-[color:var(--app-sheet-bg)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
            <div className="mb-4 pr-10">
              <div className="text-sm font-medium text-[color:var(--app-text)]">
                {messages.app.shortName()}
              </div>
              <div className="mt-1 text-xs font-normal text-[color:var(--app-text-soft)]">
                {messages.app.fullName()}
              </div>
            </div>
            <button
              type="button"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[color:var(--app-text-soft)] transition-colors hover:bg-[color:var(--app-hover-surface)] hover:text-[color:var(--app-text)]"
              onClick={closeMobileNav}
              aria-label={messages.common.close()}
            >
              <X className="h-4 w-4" />
            </button>
            {mobileNavList}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export { RootLayout }
