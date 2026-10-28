import type {
  Address,
  CalculateRequest,
  CalculationResult,
  HouseNumber,
  MunicipalityDetail,
  MunicipalitySummary,
  Neighbour,
  SearchResult,
  SourcesInfo,
} from './types'

const BASE: string = import.meta.env.VITE_API_BASE ?? '/api'

export class ApiError extends Error {
  status: number
  detail: unknown

  constructor(status: number, detail: unknown) {
    super(typeof detail === 'string' ? detail : `HTTP ${status}`)
    this.status = status
    this.detail = detail
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init)
  if (!res.ok) {
    let detail: unknown = null
    try {
      detail = (await res.json()).detail
    } catch {
      // body was not JSON
    }
    throw new ApiError(res.status, detail)
  }
  return res.json() as Promise<T>
}

export const api = {
  search: (q: string, signal?: AbortSignal) =>
    request<SearchResult[]>(`/addresses/search?${new URLSearchParams({ q, limit: '8' })}`, {
      signal,
    }),
  address: (id: string) => request<Address>(`/addresses/${encodeURIComponent(id)}`),
  streetAddresses: (streetId: number) => request<HouseNumber[]>(`/streets/${streetId}/addresses`),
  calculate: (body: CalculateRequest, signal?: AbortSignal) =>
    request<CalculationResult>('/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    }),
  municipalities: () => request<MunicipalitySummary[]>('/municipalities'),
  municipality: (code: number) => request<MunicipalityDetail>(`/municipalities/${code}`),
  neighbours: (code: number) => request<Neighbour[]>(`/municipalities/${code}/neighbours`),
  sources: () => request<SourcesInfo>('/meta/sources'),
}
