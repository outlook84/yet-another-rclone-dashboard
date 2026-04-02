import { IconChevronDown, IconPlus, IconX } from "@tabler/icons-react"
import type { ReactNode, RefObject } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import type { AppLocale } from "@/shared/i18n"
import type { AppMessages } from "@/shared/i18n/messages/types"
import { inputExamples, resolveInputExample } from "@/shared/i18n/input-examples"
import { cn } from "@/shared/lib/cn"
import { Button as UIButton } from "@/shared/components/ui/button"
import { Card as UICard, CardContent as UICardContent } from "@/shared/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Input } from "@/shared/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"

type ExplorerTabLabel = {
  id: string
  title: string
}

type ExplorerRemoteOption = {
  value: string
  label: string
}

interface ExplorerToolbarProps {
  messages: AppMessages
  locale: AppLocale
  compactHeader: boolean
  compactToolbar: boolean
  headerStorage: ReactNode
  mobileSessionsOpened: boolean
  setMobileSessionsOpened: (open: boolean) => void
  tabLabels: ExplorerTabLabel[]
  activeTabId: string
  tabsCount: number
  activeTabLabel: string
  usageSummaryLabel: string | null
  hoveredTabId: string | null
  setHoveredTabId: (tabId: string | null | ((current: string | null) => string | null)) => void
  onActivateTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onAddTab: () => void
  isPathEditing: boolean
  locationDraft: string
  setLocationDraft: (value: string) => void
  applyLocationDraft: () => void
  fullPathLabel: string
  setIsPathEditing: (editing: boolean) => void
  remoteOptions: ExplorerRemoteOption[]
  currentRemote: string
  onSelectRemote: (remote: string) => void
  pathNodes: ReactNode
  locationActionButtons: ReactNode
  uploadInputRef: RefObject<HTMLInputElement | null>
  handleUploadFileSelection: (event: React.ChangeEvent<HTMLInputElement>) => void
  uploadEnabled: boolean
  currentRemoteAvailable: boolean
  showNewDirectoryInput: boolean
  openNewDirectoryInput: (enabled: boolean) => void
  showFilterInput: boolean
  openFilterInput: (enabled: boolean) => void
  selectionMode: boolean
  toggleSelectionMode: (enabled: boolean) => void
  selectedItemsCount: number
  selectionActionButtons: ReactNode
  newDirectoryName: string
  setNewDirectoryName: (value: string) => void
  handleTransientInputEscape: (event: React.KeyboardEvent<HTMLInputElement>) => void
  createDirectory: () => void | Promise<void>
  filterText: string
  setFilterText: (value: string) => void
}

function ExplorerToolbar({
  messages,
  locale,
  compactHeader,
  compactToolbar,
  headerStorage,
  mobileSessionsOpened,
  setMobileSessionsOpened,
  tabLabels,
  activeTabId,
  tabsCount,
  activeTabLabel,
  usageSummaryLabel,
  hoveredTabId,
  setHoveredTabId,
  onActivateTab,
  onCloseTab,
  onAddTab,
  isPathEditing,
  locationDraft,
  setLocationDraft,
  applyLocationDraft,
  fullPathLabel,
  setIsPathEditing,
  remoteOptions,
  currentRemote,
  onSelectRemote,
  pathNodes,
  locationActionButtons,
  uploadInputRef,
  handleUploadFileSelection,
  uploadEnabled,
  currentRemoteAvailable,
  showNewDirectoryInput,
  openNewDirectoryInput,
  showFilterInput,
  openFilterInput,
  selectionMode,
  toggleSelectionMode,
  selectedItemsCount,
  selectionActionButtons,
  newDirectoryName,
  setNewDirectoryName,
  handleTransientInputEscape,
  createDirectory,
  filterText,
  setFilterText,
}: ExplorerToolbarProps) {
  return (
    <>
      {compactHeader && headerStorage ? (
        <div style={{ width: compactHeader ? "100%" : 320, maxWidth: "100%" }}>{headerStorage}</div>
      ) : null}
      <Sheet open={mobileSessionsOpened} onOpenChange={setMobileSessionsOpened}>
        <SheetContent side="bottom" className="sm:hidden">
          <SheetHeader>
            <SheetTitle>{messages.explorer.sessions()}</SheetTitle>
            <SheetDescription>{messages.explorer.sessionsDescription()}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2">
            {tabLabels.map((tab) => {
              const active = tab.id === activeTabId

              return (
                <UICard
                  key={tab.id}
                  onClick={() => {
                    onActivateTab(tab.id)
                    setMobileSessionsOpened(false)
                  }}
                  className={
                    active
                      ? "cursor-pointer border-[color:var(--app-interactive-selected-border)] bg-[color:var(--app-interactive-selected-bg)]"
                      : "app-surface-elevated-soft cursor-pointer"
                  }
                >
                  <UICardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className={cn("truncate text-sm text-[color:var(--app-text)]", "font-bold")}>
                          {tab.title}
                        </div>
                      </div>
                      {tabsCount > 1 ? (
                        <UIButton
                          aria-label={messages.explorer.closeSession()}
                          className="h-7 w-7 rounded-[8px] p-0 text-[color:var(--app-text-soft)]"
                          size="icon"
                          variant="ghost"
                          onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                            event.stopPropagation()
                            onCloseTab(tab.id)
                          }}
                        >
                          ×
                        </UIButton>
                      ) : null}
                    </div>
                  </UICardContent>
                </UICard>
              )
            })}
            <div className="pt-2">
              <UIButton
                variant="secondary"
                className="w-full"
                onClick={() => {
                  onAddTab()
                  setMobileSessionsOpened(false)
                }}
              >
                {messages.explorer.newSession()}
              </UIButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <UICard className="app-workspace-card app-workspace-card--quiet">
        <UICardContent className="px-3 py-3">
          <div className="flex flex-col gap-2.5">
            {compactHeader ? (
              <div className="flex items-center gap-1.5">
                <UIButton
                  variant="secondary"
                  onClick={() => setMobileSessionsOpened(true)}
                  className="min-w-0 flex-1 justify-between"
                >
                  <span className="truncate">{activeTabLabel}</span>
                  <IconChevronDown size={14} stroke={1.8} />
                </UIButton>
                {usageSummaryLabel ? (
                  <span className="shrink-0 whitespace-nowrap text-[13px] font-bold text-[color:var(--app-text-soft)]">
                    {usageSummaryLabel}
                  </span>
                ) : null}
              </div>
            ) : null}
            {!compactHeader ? (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {tabLabels.map((tab) => {
                  const active = tab.id === activeTabId

                  return (
                    <div
                      key={tab.id}
                      onMouseEnter={() => setHoveredTabId(tab.id)}
                      onMouseLeave={() => setHoveredTabId((current) => (current === tab.id ? null : current))}
                      onClick={() => onActivateTab(tab.id)}
                      className={cn(
                        "flex h-8 w-max max-w-[20%] cursor-pointer items-center justify-between gap-2 rounded-[10px] border px-3 transition-colors",
                        active
                          ? "border-[color:var(--app-interactive-selected-border)] bg-[color:var(--app-interactive-selected-bg)] text-[color:var(--app-interactive-selected-text)]"
                          : "border-transparent bg-transparent hover:border-[color:var(--app-border)] hover:bg-[color:var(--app-hover-surface-strong)]",
                      )}
                    >
                      <span className="truncate text-[13px] font-bold">{tab.title}</span>
                      {active || hoveredTabId === tab.id ? (
                        <button
                          type="button"
                          className="inline-flex h-5 w-5 items-center justify-center rounded-[7px] text-[color:var(--app-text-soft)] transition-colors hover:bg-[color:var(--app-hover-surface)] hover:text-[color:var(--app-text)]"
                          aria-label={messages.explorer.closeTab()}
                          onClick={(event) => {
                            event.stopPropagation()
                            onCloseTab(tab.id)
                          }}
                        >
                          <IconX size={13} stroke={2} />
                        </button>
                      ) : null}
                    </div>
                  )
                })}
                <UIButton
                  variant="secondary"
                  size="icon-sm"
                  aria-label={messages.explorer.newTab()}
                  onClick={onAddTab}
                  className="shrink-0"
                >
                  <IconPlus size={13} stroke={2} />
                </UIButton>
                {usageSummaryLabel ? (
                  <div className="shrink-0 self-center whitespace-nowrap px-1 text-[13px] font-bold text-[color:var(--app-text-soft)]">
                    {usageSummaryLabel}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className={cn("gap-1.5", compactToolbar ? "flex flex-col" : "flex items-center")}>
              <div style={{ flex: 1, minWidth: 0 }} className={cn(compactToolbar ? "w-full" : "")}>
                <div className="app-toolbar-card px-1.5 py-1">
                  {isPathEditing ? (
                    <Input
                      value={locationDraft}
                      placeholder={resolveInputExample(inputExamples.remotePath, locale)}
                      autoFocus
                      onChange={(event) => setLocationDraft(event.currentTarget.value)}
                      onBlur={applyLocationDraft}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          applyLocationDraft()
                        }
                        if (event.key === "Escape") {
                          setLocationDraft(fullPathLabel)
                          setIsPathEditing(false)
                        }
                      }}
                    />
                  ) : (
                    <div
                      title={fullPathLabel}
                      className="flex h-8 w-full items-center gap-1.5 overflow-hidden rounded-[10px] px-2"
                    >
                      {remoteOptions.length > 0 ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-[color:var(--app-accent-strong)] transition-colors hover:text-[color:var(--app-accent)]"
                              title={messages.explorer.chooseRemote()}
                            >
                              <span>{currentRemote ? `${currentRemote}:` : messages.explorer.chooseRemote()}</span>
                              <IconChevronDown size={14} stroke={1.8} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-[220px]">
                            {remoteOptions.map((option) => (
                              <DropdownMenuItem key={option.value} onClick={() => onSelectRemote(option.value)}>
                                {option.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="shrink-0 text-[13px] font-bold text-[color:var(--app-text-soft)]">
                          {messages.explorer.noRemotes()}
                        </span>
                      )}
                      {pathNodes ? <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">{pathNodes}</div> : null}
                    </div>
                  )}
                </div>
              </div>
              {!compactToolbar ? <div className="flex items-center gap-1">{locationActionButtons}</div> : null}
            </div>
            <div className="app-toolbar-row">
              {compactToolbar ? <div className="app-toolbar-actions gap-1.5">{locationActionButtons}</div> : null}
              <div className="app-toolbar-actions gap-1.5">
                <input
                  ref={uploadInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleUploadFileSelection}
                />
                {uploadEnabled ? (
                  <UIButton
                    variant="toolbar"
                    size="toolbar"
                    disabled={!currentRemoteAvailable}
                    onClick={() => uploadInputRef.current?.click()}
                  >
                    {messages.explorer.upload()}
                  </UIButton>
                ) : null}
                <UIButton
                  variant={showNewDirectoryInput ? "default" : "toolbar"}
                  size="toolbar"
                  onClick={() => openNewDirectoryInput(!showNewDirectoryInput)}
                >
                  {messages.explorer.newFolder()}
                </UIButton>
                <UIButton
                  variant={showFilterInput ? "default" : "toolbar"}
                  size="toolbar"
                  onClick={() => openFilterInput(!showFilterInput)}
                >
                  {messages.explorer.filter()}
                </UIButton>
                <UIButton
                  variant={selectionMode ? "default" : "toolbar"}
                  size="toolbar"
                  onClick={() => toggleSelectionMode(!selectionMode)}
                >
                  {selectionMode ? messages.explorer.done() : messages.explorer.select()}
                </UIButton>
                {selectedItemsCount > 0 ? selectionActionButtons : null}
              </div>
            </div>
            {selectionMode ? (
              <p className="text-xs text-[color:var(--app-text-soft)]">
                {selectedItemsCount > 0
                  ? messages.common.itemsSelected(selectedItemsCount)
                  : messages.explorer.selectItemsHint()}
              </p>
            ) : null}
            {currentRemoteAvailable && showNewDirectoryInput ? (
              <div className="flex items-end gap-3">
                <label className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="text-[13px] font-normal text-[color:var(--app-text-soft)]">
                    {messages.explorer.newFolder()}
                  </span>
                  <Input
                    placeholder={resolveInputExample(inputExamples.newFolderName, locale)}
                    value={newDirectoryName}
                    onChange={(event) => setNewDirectoryName(event.currentTarget.value)}
                    onKeyDown={handleTransientInputEscape}
                  />
                </label>
                <UIButton disabled={!newDirectoryName.trim()} onClick={createDirectory}>
                  {messages.common.create()}
                </UIButton>
              </div>
            ) : null}
            {currentRemoteAvailable && showFilterInput ? (
              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-normal text-[color:var(--app-text-soft)]">{messages.explorer.filter()}</span>
                <Input
                  placeholder={messages.explorer.filterByName()}
                  value={filterText}
                  onChange={(event) => setFilterText(event.currentTarget.value)}
                  onKeyDown={handleTransientInputEscape}
                />
              </label>
            ) : null}
          </div>
        </UICardContent>
      </UICard>
    </>
  )
}

export { ExplorerToolbar }
