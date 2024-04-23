export default function isDefined<T>(obj: T): obj is Exclude<T, undefined | null> {
  return obj != null;
}
