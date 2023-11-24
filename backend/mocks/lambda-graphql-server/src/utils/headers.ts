export function getDistinctMultiValueHeaders(
  headers?: Record<string, boolean | number | string>,
  multiValueHeaders?: Record<string, (boolean | number | string)[]>
) {
  const multiHeaders: Record<string, Set<string>> = {};

  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      if (!(key in multiHeaders)) {
        multiHeaders[key] = new Set<string>();
      }
      multiHeaders[key]?.add(String(value));
    });
  }

  if (multiValueHeaders) {
    Object.entries(multiValueHeaders).forEach(([key, values]) => {
      if (!(key in multiHeaders)) {
        multiHeaders[key] = new Set<string>();
      }
      values.forEach((value) => {
        multiHeaders[key]?.add(String(value));
      });
    });
  }

  const result: Record<string, string[]> = {};
  for (const [key, valueSet] of Object.entries(multiHeaders)) {
    result[key] = [...valueSet];
  }

  return result;
}
