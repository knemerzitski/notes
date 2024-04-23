import { ExcludeNullable } from './types';

/**
 * Type guard for checking keys are defined.
 */
export default function areKeysDefined<
  T extends object,
  Key extends keyof NonNullable<T>,
>(obj: T, checkKeys: Key[]): obj is ExcludeNullable<T, Key> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return obj != null && checkKeys.every((key) => obj[key] != null);
}
