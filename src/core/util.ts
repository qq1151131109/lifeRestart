// eslint-disable-next-line @typescript-eslint/no-explicit-any -- clone handles arbitrary nested structures
type Cloneable = null | boolean | number | string | Cloneable[] | { [key: string]: Cloneable }

export function clone<T extends Cloneable>(value: T): T {
    switch (typeof value) {
        case 'object':
            if (value === null) return null as T
            if (Array.isArray(value)) return value.map(v => clone(v)) as T
            const newObj: Record<string, Cloneable> = {}
            for (const key in value as Record<string, Cloneable>)
                newObj[key] = clone((value as Record<string, Cloneable>)[key])
            return newObj as T
        default: return value
    }
}

export function max(...arr: (number | number[])[]): number {
    return Math.max(...(arr.flat() as number[]))
}

export function min(...arr: (number | number[])[]): number {
    return Math.min(...(arr.flat() as number[]))
}

export function sum(...arr: (number | number[])[]): number {
    let s = 0
    ;(arr.flat() as number[]).forEach(v => (s += v))
    return s
}

export function average(...arr: (number | number[])[]): number {
    const s = sum(...arr)
    return s / (arr.flat() as number[]).length
}

export function weightRandom(list: [unknown, number][]): unknown {
    let totalWeights = 0
    for (const [, weight] of list) totalWeights += weight

    let random = Math.random() * totalWeights
    for (const [id, weight] of list) if ((random -= weight) < 0) return id
    return list[list.length - 1]
}

export function listRandom<T>(list: T[]): T {
    return list[Math.floor(Math.random() * list.length)]
}

export function getListValuesMap<T>(list: string[], fn: (key: string) => T): Record<string, T> {
    const map: Record<string, T> = {}
    list.forEach(key => (map[key] = fn(key)))
    return map
}

export function mapConvert<T>(map: Record<string, T>, fn: (key: string, value: T) => T): void {
    for (const key in map) map[key] = fn(key, map[key])
}

export function getConvertedMap<T, U>(map: Record<string, T>, fn: (key: string, value: T) => U): Record<string, U> {
    const newMap: Record<string, U> = {}
    for (const key in map) newMap[key] = fn(key, map[key])
    return newMap
}

export function mapSet<T>(target: Record<string, T>, source: Record<string, T>): void {
    for (const key in source) target[key] = source[key]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- deepMapSet handles arbitrary nested objects with function values
export function deepMapSet(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    for (const key in source) {
        // Preserve original fallthrough logic: function → call it, then treat result as object/default
        let value = source[key]
        if (typeof value === 'function') value = value()
        if (typeof value === 'object' && !Array.isArray(value)) {
            deepMapSet(target[key], value)
        } else {
            target[key] = value
        }
    }
    return target
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- deepGet traverses arbitrary nested object paths
export function deepGet(obj: Record<string, any>, path: string): unknown {
    for (const key of path.split('.')) {
        if (!(key in obj)) return undefined
        obj = obj[key]
    }
    return obj
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- format args can be any value for string interpolation
export function format(str: string, ...args: any[]): string {
    const replace = (set: Record<string, unknown> | unknown[]) => (_match: string, key: string): string => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deepGet returns unknown, need dynamic dispatch
        const value = deepGet(set as Record<string, any>, key)
        switch (typeof value) {
            case 'object': return JSON.stringify(value)
            case 'boolean':
            case 'number':
            case 'string': return String(value)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic fallback toString
            default: return (value as any)?.toString?.() || _match
        }
    }

    switch (args.length) {
        case 0: return str
        case 1:
            if (typeof args[0] !== 'object') break
            return str.replace(/{(.+?)}/g, replace(args[0]))
    }
    return str.replace(/{(\d+)}/g, replace(args))
}
