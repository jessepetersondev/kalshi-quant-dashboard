export function describeMutationSuccess(label: string): string {
  return `${label} saved successfully.`;
}

export function describeMutationFailure(label: string, message: string): string {
  return `${label} failed: ${message}`;
}
