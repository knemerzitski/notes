import { WritableDraft } from 'immer';

/**
 * immer cast without WritableDraft
 */
export function castNormal<T>(
  value: T
): T extends WritableDraft<infer U>[] ? U[] : T extends WritableDraft<infer U> ? U : T {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
  return value as any;
}
