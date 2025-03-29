import { PickReadEmitter } from 'mitt';

import { Logger } from '../../../../utils/src/logging';

import { CollabService, CollabServiceEvents } from '../../client/collab-service';

import { StructJsonFormatter } from './struct-json-formatter';
import { StringRecordStruct } from './types';
import { ViewTextMemo } from './view-text-memo';

interface ViewTextAtRevision<K extends string, S extends StringRecordStruct> {
  revision: number;
  memo: ViewTextMemo<K, S>;
}

export class ViewTextMemosCache<K extends string, S extends StringRecordStruct> {
  private readonly logger;

  private readonly formatter;
  private readonly service;

  private readonly views: ViewTextAtRevision<K, S>[] = [];

  private readonly eventsOff;

  private _view: ViewTextMemo<K, S>;
  get view() {
    return this._view;
  }

  private _prevView: ViewTextMemo<K, S> | null = null;
  get prevView() {
    return this._prevView ?? this._view;
  }

  constructor(
    formatter: StructJsonFormatter<K, S>,
    service: Pick<CollabService, 'viewText' | 'headRevision'> & {
      eventBus: PickReadEmitter<CollabServiceEvents, 'headRevisionChanged'>;
    },
    options?: {
      logger?: Logger;
    }
  ) {
    this.logger = options?.logger;

    this.formatter = formatter;
    this.service = service;

    this._view = this.newView();
    this.pushView(this._view);

    this.eventsOff = [
      service.eventBus.on('headRevisionChanged', ({ revision }) => {
        // Remove unused revisions
        const index = this.views.findLastIndex((item) => item.revision === revision);

        this.logger?.debug('removeUnusedRevisions', {
          headRevision: revision,
          splice: [0, index],
        });

        if (index > 0) {
          this.views.splice(0, index);
        }
      }),
    ];
  }

  cleanUp() {
    this.eventsOff.forEach((off) => {
      off();
    });
  }

  newView(isFormatted = false) {
    return new ViewTextMemo<K, S>(this.formatter, this.service.viewText, isFormatted, {
      logger: this.logger?.extend('ViewTextMemo'),
    });
  }

  pushView(view: ViewTextMemo<K, S>) {
    const revision = this.service.headRevision;
    const item: ViewTextAtRevision<K, S> = {
      revision: this.service.headRevision,
      memo: view,
    };

    const last = this.views[this.views.length - 1];
    if (last && last.revision === revision) {
      this.logger?.debug('pushView.replaceLast', item);
      this.views[this.views.length - 1] = item;
    } else {
      this.logger?.debug('pushView.push', item);
      this.views.push(item);
    }

    this._prevView = last?.memo ?? null;
    this._view = view;
  }

  getClosestOlderRevisionView(revision: number) {
    const index = this.views.findLastIndex((item) => item.revision === revision);
    if (index > 0) {
      return this.views[index - 1]?.memo;
    }
    return;
  }
}
