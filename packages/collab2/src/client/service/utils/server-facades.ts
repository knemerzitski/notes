import mitt from 'mitt';

import { ServerFacade, ServerFacadeEvents } from '../types';

export class ServerFacades {
  private eventBus = mitt<ServerFacadeEvents>();

  private readonly listeners = {
    recordsUpdated: this.recordsUpdated.bind(this),
  };

  get size() {
    return this.facades.size;
  }

  constructor(private readonly facades: Set<ServerFacade>) {}

  readonly on = this.eventBus.on.bind(this.eventBus);
  readonly off = this.eventBus.off.bind(this.eventBus);

  add(facade: ServerFacade) {
    this.facades.add(facade);

    facade.on('records:updated', this.listeners.recordsUpdated);
  }

  remove(facade: ServerFacade) {
    facade.off('records:updated', this.listeners.recordsUpdated);

    this.facades.delete(facade);
  }

  head() {
    for (const facade of this.facades) {
      const record = facade.head();
      if (record) {
        return record;
      }
    }
    return;
  }

  text(targetRevision: number) {
    for (const facade of this.facades) {
      const record = facade.text(targetRevision);
      if (record) {
        return record;
      }
    }
    return;
  }

  *range(startRevision: number, endRevision: number) {
    for (const facade of this.facades) {
      for (const serverRecord of facade.range(startRevision, endRevision)) {
        yield serverRecord;
        startRevision = serverRecord.revision + 1;
      }
    }
  }

  at(revision: number) {
    for (const facade of this.facades) {
      const record = facade.at(revision);
      if (record) {
        return record;
      }
    }
    return;
  }

  *beforeIterable(beforeRevision: number) {
    for (const facade of this.facades) {
      for (const serverRecord of facade.beforeIterable(beforeRevision)) {
        yield serverRecord;
        beforeRevision = serverRecord.revision - 1;
      }
    }
  }

  hasBefore(beforeRevision: number) {
    return [...this.facades].some((facade) => facade.hasBefore(beforeRevision));
  }

  private recordsUpdated(event: { readonly facade: ServerFacade }) {
    this.eventBus.emit('records:updated', event);
  }
}
