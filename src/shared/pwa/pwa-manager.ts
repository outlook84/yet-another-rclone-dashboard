type PwaUpdateListener = () => void

const SERVICE_WORKER_URL = `${import.meta.env.BASE_URL}sw.js?build=${__APP_BUILD_ID__}`
const pwaRuntime = {
  isDev: () => import.meta.env.DEV,
  reloadPage: () => window.location.reload(),
}

let waitingWorker: ServiceWorker | null = null
let reloadOnControllerChange = false
const listeners = new Set<PwaUpdateListener>()
const trackedInstallingWorkers = new WeakSet<ServiceWorker>()

function notifyUpdateReady() {
  for (const listener of listeners) {
    listener()
  }
}

function trackInstallingWorker(registration: ServiceWorkerRegistration, worker: ServiceWorker) {
  if (trackedInstallingWorkers.has(worker)) {
    return
  }

  trackedInstallingWorkers.add(worker)
  worker.addEventListener("statechange", () => {
    if (worker.state === "installed" && navigator.serviceWorker.controller) {
      waitingWorker = registration.waiting ?? worker
      notifyUpdateReady()
    }
  })
}

function registerPwa() {
  if (!("serviceWorker" in navigator) || pwaRuntime.isDev()) {
    return
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(SERVICE_WORKER_URL).then((registration) => {
      if (registration.waiting) {
        waitingWorker = registration.waiting
        notifyUpdateReady()
      }

      if (registration.installing) {
        trackInstallingWorker(registration, registration.installing)
      }

      registration.addEventListener("updatefound", () => {
        if (registration.installing) {
          trackInstallingWorker(registration, registration.installing)
        }
      })

      void registration.update()
    })
  })
}

function subscribeToPwaUpdate(listener: PwaUpdateListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function hasPendingPwaUpdate() {
  return waitingWorker !== null
}

function activatePwaUpdate() {
  reloadOnControllerChange = true
  waitingWorker?.postMessage({ type: "SKIP_WAITING" })
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!reloadOnControllerChange) {
      return
    }

    reloadOnControllerChange = false
    pwaRuntime.reloadPage()
  })
}

export { activatePwaUpdate, hasPendingPwaUpdate, pwaRuntime, registerPwa, subscribeToPwaUpdate }
