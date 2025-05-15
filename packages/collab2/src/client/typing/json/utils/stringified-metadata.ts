// Find all key value pairs, e.g. json stringified '{"a": "b"}' matches {1: 'a', 2: 'b'}
const REGEX = /"((?:[^"\\]|\\.)*)":"((?:[^"\\]|\\.)*)"/g;

export function stringifiedMetadata(text: string) {
  return Object.fromEntries(
    [...text.matchAll(REGEX)].map((match) => {
      const index = match.index;
      const key = match[1] ?? '';
      const value = (match[2] as string | undefined) ?? '';

      const start = index + key.length + 4;
      const end = start + value.length;

      return [
        key,
        {
          start,
          end,
        },
      ];
    })
  );
}
