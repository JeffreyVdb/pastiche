export function formatSize(input: string | number): string {
  const bytes = typeof input === "number" ? input : new TextEncoder().encode(input).byteLength;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
