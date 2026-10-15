const BROADCAST_KEY = 'ts:storage:broadcast'

type Handler = (key: string, newValue: string | null) => void

const handlers = new Map<string, Set<Handler>>()

let initialized = false

const windowId = crypto.randomUUID()

function initCrossTabSync(keys: string[]) {
  if (initialized) return
  initialized = true

  const channel = new BroadcastChannel(BROADCAST_KEY)

  channel.onmessage = (e: MessageEvent) => {
    const { key, value, source } = e.data
    if (source === windowId) return
    handlers.get(key)?.forEach(h => h(key, value))
  }

  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key && keys.includes(e.key)) {
      handlers.get(e.key)?.forEach(h => h(e.key!, e.newValue))
    }
  })
}

function onStorageChange(key: string, handler: Handler) {
  if (!handlers.has(key)) handlers.set(key, new Set())
  handlers.get(key)!.add(handler)
  return () => { handlers.get(key)?.delete(handler) }
}

function broadcastStorage(key: string, value: string | null) {
  const channel = new BroadcastChannel(BROADCAST_KEY)
  channel.postMessage({ key, value, source: windowId })
  channel.close()
}

export { initCrossTabSync, onStorageChange, broadcastStorage }