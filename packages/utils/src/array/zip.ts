/* eslint-disable @typescript-eslint/no-non-null-assertion */

export function zip<A1 extends readonly unknown[]>(a1: A1): Generator<[A1[0]]>;
export function zip<A1 extends readonly unknown[], A2 extends readonly unknown[]>(
  a1: A1,
  a2: A2
): Generator<[A1[0], A2[0]]>;
export function zip<
  A1 extends readonly unknown[],
  A2 extends readonly unknown[],
  A3 extends readonly unknown[],
>(a1: A1, a2: A2, a3: A3): Generator<[A1[0], A2[0], A3[0]]>;
export function zip<
  A1 extends readonly unknown[],
  A2 extends readonly unknown[],
  A3 extends readonly unknown[],
  A4 extends readonly unknown[],
>(a1: A1, a2: A2, a3: A3, a4: A4): Generator<[A1[0], A2[0], A3[0], A4[0]]>;
export function zip<
  A1 extends readonly unknown[],
  A2 extends readonly unknown[],
  A3 extends readonly unknown[],
  A4 extends readonly unknown[],
  A5 extends readonly unknown[],
>(a1: A1, a2: A2, a3: A3, a4: A4, a5: A5): Generator<[A1[0], A2[0], A3[0], A4[0], A5[0]]>;
export function zip(...arrays: unknown[][]): Generator<unknown[]>;
export function* zip(...arrays: unknown[][]): Generator<unknown[]> {
  const n = arrays[0]?.length;
  if (n === undefined) {
    return [];
  }

  const m = arrays.length;
  for (let i = 0; i < m; i++) {
    const n_i = arrays[i]?.length;
    if (n_i !== n) {
      throw new Error(`Expected array of length ${n} but is ${n_i}`);
    }
  }

  for (let j = 0; j < n; j++) {
    const item = new Array(m);
    for (let i = 0; i < m; i++) {
      item[i] = arrays[i]![j];
    }
    yield item;
  }
}
