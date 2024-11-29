/**
 * Id is local if it's a string with length less than 16
 */
export function isLocalId(id: unknown): boolean {
  if (typeof id !== 'string') {
    return false;
  }

  return id.length < 16;
}
