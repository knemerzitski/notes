/**
 * Key and value must not contains colon or comma
 *
 * @param strRecord Structure: "key1:value1,key2:value2"
 */
export function parseSimpleRecord(strRecord: string | undefined): Record<string, string> {
  if (!strRecord) {
    return {};
  }

  const entryStrs = strRecord.split(',');

  return Object.fromEntries(
    entryStrs
      .map((pair) => {
        const [key = '', value = ''] = pair.split(':', 2);
        return [key, value];
      })
      .filter(isNonEmptyStringPair)
  );
}

/**
 *
 * Key and value must not contains colon or comma
 *
 * @returns string with structure: "key1:value1,key2:value2"
 */
export function serializeSimpleRecord(record: Record<string, string>): string {
  return Object.entries(record)
    .map(([userId, cookieId]) => `${userId}:${cookieId}`)
    .join(',');
}

function isNonEmptyStringPair(arr: string[]): arr is [string, string] {
  return (
    typeof arr[0] === 'string' &&
    arr[0].length > 0 &&
    typeof arr[1] === 'string' &&
    arr[1].length > 0
  );
}
