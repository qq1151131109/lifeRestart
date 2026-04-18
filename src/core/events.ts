type Listener = (data: unknown) => void

const listeners = new Map<string, Set<Listener>>()

export function on(tag: string, fn: Listener): void {
    let set = listeners.get(tag)
    if (!set) { set = new Set(); listeners.set(tag, set) }
    set.add(fn)
}

export function off(tag: string, fn: Listener): void {
    listeners.get(tag)?.delete(fn)
}

export function emit(tag: string, data?: unknown): void {
    listeners.get(tag)?.forEach(fn => fn(data))
}

export function clearAll(): void {
    listeners.clear()
}
