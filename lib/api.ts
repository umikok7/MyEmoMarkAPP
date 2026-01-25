const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api"

const normalizeBase = (base: string) => base.replace(/\/+$/, "")

const buildPath = (path: string) => {
  const normalizedBase = normalizeBase(RAW_API_BASE)
  const cleanedPath = path.startsWith("/") ? path : `/${path}`
  return `${normalizedBase}${cleanedPath}`
}

const buildQueryString = (params?: Record<string, string | number | boolean | null | undefined>) => {
  if (!params) return ""
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  return serialized.length ? `?${serialized.join("&")}` : ""
}

export const buildApiUrl = (
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>
) => `${buildPath(path)}${buildQueryString(params)}`
