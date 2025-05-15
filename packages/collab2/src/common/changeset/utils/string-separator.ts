/**
 * Separate string while respecing bounded strings
 */
export function stringSeparator(
  text: string,
  separator = ',',
  stringBoundary = '"',
  stringEscape = '\\'
): string[] {
  const result: string[] = [];

  let state: 'default' | 'in-string' | 'in-string-escape' = 'default';

  let i = 0;
  let lastSeparatorIndex = -1;
  for (const char of text) {
    if (state === 'default') {
      if (char === separator) {
        // might use push +.join() if there is an performance impact
        result.push(text.substring(lastSeparatorIndex + 1, i));
        lastSeparatorIndex = i;
      } else if (char === stringBoundary) {
        state = 'in-string';
      }
    } else if (state === 'in-string') {
      if (char === stringEscape) {
        state = 'in-string-escape';
      } else if (char === stringBoundary) {
        state = 'default';
      }
    } else {
      state = 'in-string';
    }

    i++;
  }

  result.push(text.substring(lastSeparatorIndex + 1, text.length));

  return result;
}
