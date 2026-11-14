export function extensionContainerName(name: string): string {
  if (name.length === 0) throw new Error('extension name is required');
  return name.replace(/[^a-zA-Z0-9_$]/g, '_');
}
