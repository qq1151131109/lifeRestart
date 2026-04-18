export type DataSet = 'achievement' | 'age' | 'character' | 'events' | 'talents'

let baseUrl = '/data'
let language = 'zh-cn'

export function configureLoader(opts: { baseUrl?: string; language?: string }): void {
  if (opts.baseUrl !== undefined) baseUrl = opts.baseUrl
  if (opts.language !== undefined) language = opts.language
}

export async function loadDataSet<T = unknown>(name: DataSet): Promise<T> {
  const url = `${baseUrl}/${language}/${name}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`loadDataSet(${name}): HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export async function loadRaw<T = unknown>(path: string): Promise<T> {
  const url = `${baseUrl}/${path}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`loadRaw(${path}): HTTP ${res.status}`)
  return res.json() as Promise<T>
}
