import { buildApiUrl } from "@/lib/api"

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

type ApiEnvelope<T> = {
  code: number
  msg?: string
  errs?: string
  data: T | null
}

const request = async <T>(
  path: string,
  init?: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
    body?: unknown
    params?: Record<string, string | number | boolean | null | undefined>
  }
): Promise<T> => {
  const { method = "GET", body, params } = init ?? {}

  // 隐私红线：错误只暴露 status/message，不携带请求头、令牌或完整请求上下文
  const response = await fetch(buildApiUrl(path, params), {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let payload: ApiEnvelope<T> | null = null
  try {
    payload = (await response.json()) as ApiEnvelope<T>
  } catch {
    payload = null
  }

  if (!response.ok || payload?.code !== 0) {
    throw new ApiError(response.status, payload?.msg ?? `Request failed (${response.status})`)
  }

  return payload.data as T
}

export const apiGet = <T>(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>
) => request<T>(path, { method: "GET", params })

export const apiPost = <T>(path: string, body?: unknown, params?: Record<string, string | number | boolean | null | undefined>) =>
  request<T>(path, { method: "POST", body, params })

export const apiPatch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "PATCH", body })

export const apiPut = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "PUT", body })

export const apiDelete = <T>(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>
) => request<T>(path, { method: "DELETE", params })
