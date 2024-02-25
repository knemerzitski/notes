export interface Serializable<I> {
  serialize(): I;
}
export interface Parseable<T> {
  parseValue(value: unknown): T | undefined;
}
