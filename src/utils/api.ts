/**
 * Helpers for building Ingress-safe relative URLs.
 * When HomeBoard runs behind Home Assistant Ingress (/api/hassio_ingress/<token>/),
 * root-relative "/api/..." requests would hit HA's own "/api/..." instead of the add-on.
 * Relative "./api/..." works identically on localhost:3000, Docker, and HA Ingress.
 */
export function apiUrl(path: string): string {
  if (!path) return './';
  if (/^https?:\/\//i.test(path)) return path;
  return `./${path.replace(/^\/+/, '')}`;
}

export function resolveAssetUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `./${url.replace(/^\/+/, '')}`;
}
