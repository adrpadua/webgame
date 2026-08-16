// Canonical JSON: recursively key-sorted, so the same value always produces
// the same text. Fingerprints and replay comparison both depend on this.
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortValue(value))
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue)
  }
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort()) {
      result[key] = sortValue(source[key])
    }
    return result
  }
  return value
}

// SHA-256 over UTF-8 text via Web Crypto, available in both the browser and
// Node — the engine stays free of platform imports.
export async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
