const BUILD_ID = new URL(self.location.href).searchParams.get("build") ?? "dev"
const CACHE_PREFIX = "yard-app-shell-"
const CACHE_NAME = `yard-app-shell-${BUILD_ID}`
const APP_SHELL_PATHS = [
  "./",
  "./index.html",
  "./asset-manifest.json",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./icons/icon-192.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
]
const APP_ROOT_URL = toScopedUrl("./")
const APP_INDEX_URL = toScopedUrl("./index.html")

self.addEventListener("install", (event) => {
  event.waitUntil(
    installAppShell(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  if (request.method !== "GET") {
    return
  }

  const url = new URL(request.url)

  if (url.origin !== self.location.origin) {
    return
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request))
    return
  }

  if (["style", "script", "worker", "font", "image"].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request))
  }
})

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME)

  try {
    const response = await fetch(request)
    if (response.ok) {
      await cache.put(request, response.clone())
      await cache.put(APP_ROOT_URL, response.clone())
    }
    return response
  } catch {
    return (await cache.match(request))
      ?? (await cache.match(APP_ROOT_URL))
      ?? (await cache.match(APP_INDEX_URL))
      ?? Response.error()
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)

  const networkResponsePromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        void cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => undefined)

  if (cachedResponse) {
    void networkResponsePromise
    return cachedResponse
  }

  const networkResponse = await networkResponsePromise
  return networkResponse ?? Response.error()
}

async function installAppShell() {
  const cache = await caches.open(CACHE_NAME)
  await cache.addAll(APP_SHELL_PATHS.map((path) => toScopedUrl(path)))

  const manifestResponse = await fetch(toScopedUrl("./asset-manifest.json"), {
    cache: "no-store",
  }).catch(() => null)

  if (!manifestResponse?.ok) {
    return
  }

  const buildManifest = await manifestResponse.json().catch(() => null)
  if (!buildManifest || typeof buildManifest !== "object") {
    return
  }

  const urlsToCache = collectManifestUrls(buildManifest)
  await cache.addAll(urlsToCache)
}

function collectManifestUrls(buildManifest) {
  const urls = new Set()
  const visitedEntries = new Set()

  for (const entryName of Object.keys(buildManifest)) {
    collectManifestEntryUrls(buildManifest, entryName, urls, visitedEntries)
  }

  return Array.from(urls)
}

function collectManifestEntryUrls(buildManifest, entryName, urls, visitedEntries) {
  if (visitedEntries.has(entryName)) {
    return
  }

  visitedEntries.add(entryName)

  const entry = buildManifest[entryName]
  if (!entry || typeof entry !== "object") {
    return
  }

  if (typeof entry.file === "string") {
    urls.add(toAbsoluteAssetUrl(entry.file))
  }

  if (Array.isArray(entry.css)) {
    for (const cssFile of entry.css) {
      urls.add(toAbsoluteAssetUrl(cssFile))
    }
  }

  if (Array.isArray(entry.assets)) {
    for (const assetFile of entry.assets) {
      urls.add(toAbsoluteAssetUrl(assetFile))
    }
  }

  if (Array.isArray(entry.imports)) {
    for (const importedEntryName of entry.imports) {
      collectManifestEntryUrls(buildManifest, importedEntryName, urls, visitedEntries)
    }
  }
}

function toAbsoluteAssetUrl(file) {
  return new URL(file, self.registration.scope).toString()
}

function toScopedUrl(path) {
  return new URL(path, self.registration.scope).toString()
}
