import { MaybePromise } from './types';

export default function mapObject<
  TKey extends string | number | symbol,
  TValue,
  TMappedValue,
>(
  obj: Record<TKey, TValue>,
  mapFn: (value: TValue, key: TKey, index: number) => TMappedValue
): Record<TKey, TMappedValue> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v], i) => [k, mapFn(v as TValue, k as TKey, i)])
  ) as Record<TKey, TMappedValue>;
}

export async function mapObjectPromise<
  TKey extends string | number | symbol,
  TValue,
  TMappedValue,
>(
  obj: Record<TKey, TValue>,
  mapFn: (value: TValue, key: TKey, index: number) => MaybePromise<TMappedValue>
): Promise<Record<TKey, TMappedValue>> {
  const entries = Object.entries(obj).map(([k, v], i) => [
    k,
    mapFn(v as TValue, k as TKey, i),
  ]);
  const resolvedValues = await Promise.all(entries.map((v) => v[1]));
  return Object.fromEntries(resolvedValues.map((value, index) => [entries[index]?.[0], value])) as Record<
    TKey,
    TMappedValue
  >;
}
