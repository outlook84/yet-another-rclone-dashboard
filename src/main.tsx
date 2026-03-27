import React from "react"
import ReactDOM from "react-dom/client"
import { App } from "@/app/entry/app"
import "@/app/entry/global.css"
import { initializeLocaleDocument } from "@/shared/i18n"
import { initializeThemeDocument } from "@/shared/store/theme-store"

initializeThemeDocument()
initializeLocaleDocument()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
