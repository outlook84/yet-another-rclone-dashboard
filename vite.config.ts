import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: "asset-manifest.json",
  },
  define: {
    __APP_BUILD_ID__: JSON.stringify(`${Date.now()}`),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
