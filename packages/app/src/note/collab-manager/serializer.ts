import { CollabService } from '../../../../collab/src';
import { StoreSetBuffer, Serializable } from '../../persistence/types';

export class Serializer {
  private readonly serializableService;

  private disposeHandlers: (() => void) | undefined;

  constructor(
    private key: string,
    private ctx: {
      readonly service: CollabService;
      readonly store: Pick<StoreSetBuffer, 'set' | 'has' | 'remove'>;
    }
  ) {
    this.updateKey(key);

    this.serializableService = new SerializableCollabService(ctx.service);
  }

  listen() {
    if (this.disposeHandlers) {
      return;
    }

    this.disposeHandlers = this.ctx.service.on(
      ['view:changed', 'submittedChanges:acknowledged', 'headRecord:reset'],
      () => {
        this.addToStoreBuffer();
      }
    );
  }

  stop() {
    this.disposeHandlers?.();
  }

  updateKey(key: string) {
    const prevKey = this.key;
    this.key = key;

    if (prevKey !== key) {
      if (this.ctx.store.has(prevKey)) {
        this.ctx.store.remove(prevKey);
        this.addToStoreBuffer();
      }
    }
  }

  private addToStoreBuffer() {
    this.ctx.store.set(this.key, this.serializableService);
  }
}

export class SerializableCollabService implements Serializable {
  constructor(private readonly service: CollabService) {}

  serialize(): unknown {
    return this.service.serialize(true);
  }
}
