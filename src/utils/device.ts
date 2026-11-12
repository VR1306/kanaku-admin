/** Turns a raw User-Agent into a short label like "Chrome on macOS" (same style as the user app's session list). */
export function describeDevice(ua: string): string {
  const os = /iPhone|iPad/.test(ua)
    ? 'iPhone'
    : /Android/.test(ua)
      ? 'Android'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X|Macintosh/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : /curl|python|node/i.test(ua)
              ? 'API client'
              : '';
  return [browser, os].filter(Boolean).join(' on ') || 'Unknown device';
}
export const isMobileDevice = (label: string) => /iPhone|Android/.test(label);
