export interface Serializable<I> {
  serialize(): I;
}
export interface Deserializable<T> {
  deserialize(value: unknown): T | undefined;
}
