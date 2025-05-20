/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

export function stripSymbols<T>(obj: T): T {
  if (Array.isArray(obj)) {
    // @ts-expect-error Ignore typing
    return obj.map(stripSymbols);
  } else if (obj && typeof obj === 'object') {
    const proto = Object.getPrototypeOf(obj);
    const result = Object.create(proto);

    for (const key of Object.keys(obj)) {
      // @ts-expect-error Ignore typing
      result[key] = stripSymbols(obj[key]);
    }

    return result;
  }

  return obj;
}
