type Listener<T = unknown> = (payload: T) => void

type EventMap = {
  'accounts:changed': { accountId?: string; action?: 'create' | 'update' | 'delete' | 'override' | 'reset' }
  'trades:changed': { accountId?: string; tradeId?: string; action?: 'create' | 'update' | 'delete' | 'batchDelete' }
  'outlook:changed': undefined
  'payouts:changed': { accountId: string }
}

const listeners = new Map<keyof EventMap, Set<Listener<any>>>()

function on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>) {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event)!.add(listener)
  return () => { listeners.get(event)?.delete(listener) }
}

function off<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>) {
  listeners.get(event)?.delete(listener)
}

function emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
  listeners.get(event)?.forEach(l => {
    try { (l as Listener<EventMap[K]>)(payload) } catch {}
  })
}

const debounceTimers = new Map<keyof EventMap, ReturnType<typeof setTimeout>>()
const pendingPayloads = new Map<keyof EventMap, EventMap[keyof EventMap][]>()

function emitDebounced<K extends keyof EventMap>(event: K, payload: EventMap[K], delay = 100) {
  if (!pendingPayloads.has(event)) pendingPayloads.set(event, [])
  pendingPayloads.get(event)!.push(payload)

  if (debounceTimers.has(event)) return

  debounceTimers.set(event, setTimeout(() => {
    const payloads = pendingPayloads.get(event) ?? []
    pendingPayloads.set(event, [])
    debounceTimers.delete(event)

    if (payloads.length === 1) {
      emit(event, payloads[0] as EventMap[K])
    } else {
      emit(event, { batch: payloads } as unknown as EventMap[K])
    }
  }, delay))
}

export const eventBus = { on, off, emit, emitDebounced }