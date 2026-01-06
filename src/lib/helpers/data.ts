/**
 * Generate a random UUID v4.
 *
 * This is a thin wrapper around crypto.randomUUID() for consistency
 * and easier testing/mocking if needed.
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

// Fet file ext from file mimetype
export function getFileExtFromMimeType(mimeType: string): string {
  const match = mimeType.match(/\/([^/]+)$/);
  return match ? match[1].toLowerCase() : "";
}
