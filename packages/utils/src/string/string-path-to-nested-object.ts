/**
 * @example
 * ```
 * {
 *  a: {
 *    b: {
 *      c: 1
 *    }
 *  }
 * }
 * = stringPropertyToObject('a.b.c', 1)
 *
 * ```
 */
export function stringPathToNestedObject(
  path: string,
  value: unknown,
  separator = '.'
): object | undefined {
  if (path.length === 0) return;

  const root: Record<string, unknown> = {};

  let target = root;
  const keys = path.split(separator);
  if (keys.length === 0) {
    return;
  }

  for (let i = 0; i < keys.length - 1; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const key = keys[i]!;
    const nextTarget = {};
    target[key] = nextTarget;
    target = nextTarget;
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const lastKey = keys[keys.length - 1]!;
  target[lastKey] = value;

  return root;
}
