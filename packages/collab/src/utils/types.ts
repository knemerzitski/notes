import { BaseEvents, Handler } from 'mitt';

export interface LimitedEmitter<Events extends BaseEvents> {
  on<Key extends keyof Events>(
    type: Key | Key[],
    handler: Handler<Events[Key]>
  ): () => void;
  off<Key extends keyof Events>(type: Key, handler?: Handler<Events[Key]>): void;
  emit<Key extends keyof Events>(type: Key, event: Events[Key]): void;
  emit<Key extends keyof Events>(type: undefined extends Events[Key] ? Key : never): void;
}
