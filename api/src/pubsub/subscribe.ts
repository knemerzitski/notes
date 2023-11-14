export interface SubscribeEvent {
  topic: string;
}

export type Subscriber<T = unknown> = (topic: string) => T;
