import { ObjectId } from 'mongodb';

/**
 * Groups array by "userId" ObjectId value.
 */
export default function groupByUserId<T extends { userId: ObjectId }>(
  keys: readonly T[]
) {
  return keys.reduce<Record<string, Readonly<T>[]>>((map, key) => {
    const userIdStr = key.userId.toString();
    const existing = map[userIdStr];
    if (existing) {
      existing.push(key);
    } else {
      map[userIdStr] = [key];
    }
    return map;
  }, {});
}
