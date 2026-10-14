const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
export const API_URL = `${configuredApiUrl.startsWith('http') ? '' : 'https://'}${configuredApiUrl}`.replace(/\/$/, '')
export const API_ORIGIN = API_URL.replace(/\/api$/, '')

export type User = { id: string; name: string; email: string; role: 'student' | 'admin'; created_at: string }
export type Item = {
  id: string; reporter_id: string; reporter_name: string; item_type: 'lost' | 'found'; title: string
  description: string; category: string; color: string | null; location: string; event_date: string
  image_path: string | null; status: 'open' | 'under_review' | 'returned' | 'closed'
  handed_to_custodian: boolean; created_at: string
}
export type Claim = { id: string; item_id: string; claimant_id: string; private_evidence: string; status: string; reviewer_id: string | null; created_at: string; updated_at: string }
export type Match = { id: string; source_item_id: string; score: number; explanation: string[]; item: Item }
export type Notification = { id: string; title: string; message: string; related_item_id: string | null; is_read: boolean; created_at: string }
export type Stats = { active_reports: number; lost_reports: number; found_reports: number; returned_items: number; campus_members: number }
export type Dashboard = { reports: Item[]; claims: Claim[]; matches: Match[]; notifications: Notification[]; unread_notifications: number }
export type AdminStats = {
  users: number; lost_reports: number; found_reports: number; pending_claims: number; returned_items: number
  by_category: { category: string; count: number }[]; by_location: { location: string; count: number }[]
  recent_reports: { id: string; title: string; item_type: string; status: string; created_at: string }[]
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = sessionStorage.getItem('lostlink_token')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string | { loc?: (string | number)[]; msg?: string }[] } | null
    if (response.status === 401) sessionStorage.removeItem('lostlink_token')
    const detail = body?.detail
    const message = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map(issue => `${issue.loc?.join('.') || 'Input'}: ${issue.msg || 'Invalid value'}`).join('; ')
        : `Request failed (${response.status})`
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const jsonBody = (value: unknown) => JSON.stringify(value)
