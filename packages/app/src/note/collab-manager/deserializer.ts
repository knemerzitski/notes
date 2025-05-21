import mitt from 'mitt';

import { CollabService } from '../../../../collab/src';
import { Store } from '../../persistence/types';

type Status = 'deserializing' | 'done';

export interface DeserializerEvents {
  'status:changed': Status;
}

export class Deserializer {
  private readonly eventBus = mitt<DeserializerEvents>();
  readonly on = this.eventBus.on.bind(this.eventBus);
  readonly off = this.eventBus.off.bind(this.eventBus);

  private deserializingPromises = new Set<Promise<unknown>>();

  get status(): Status {
    return this.deserializingPromises.size > 0 ? 'deserializing' : 'done';
  }

  constructor(
    private key: string,
    private readonly service: CollabService
  ) {
    this.updateKey(key);
  }

  updateKey(key: string) {
    this.key = key;
  }

  deserialize(
    store: Pick<Store, 'get'>,
    options?: {
      /**
       *
       * @returns This is invoekd when store has nothing serialized. Typically
       * on first time creation.
       */
      onEmpty?: () => void;
    }
  ) {
    const targetKey = this.key;

    return new Promise<void>((res) => {
      this.addDeserializingPromise(
        store.get(targetKey).then((value) => {
          if (this.key != targetKey) {
            // Key changed, deserialize again with correct key
            void this.deserialize(store).then(res);
            return;
          }

          try {
            if (value) {
              this.service.deserialize(value);
            } else {
              options?.onEmpty?.();
            }
          } finally {
            res();
          }
        })
      );
    });
  }

  private addDeserializingPromise(promise: Promise<unknown>) {
    this.deserializingPromises.add(promise);
    if (this.deserializingPromises.size === 1) {
      this.eventBus.emit('status:changed', 'deserializing');
    }

    void promise.finally(() => {
      this.deserializingPromises.delete(promise);
      if (this.deserializingPromises.size === 0) {
        this.eventBus.emit('status:changed', 'done');
      }
    });
  }
}
