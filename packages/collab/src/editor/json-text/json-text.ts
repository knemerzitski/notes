import { PickReadEmitter } from 'mitt';

import { Logger } from '../../../../utils/src/logging';

import { Changeset } from '../../changeset';
import { CollabService, CollabServiceEvents } from '../../client/collab-service';
import { SelectionRange } from '../../client/selection-range';
import { SelectionChangeset, SimpleText, SimpleTextOperationOptions } from '../../types';

import { KeySimpleText } from './key-simple-text';
import { StructJsonFormatter } from './struct-json-formatter';
import { StringRecordStruct } from './types';
import { ViewTextKeyPrevView } from './view-text-key-prev-view';
import { ViewTextKeyView } from './view-text-key-view';
import { ViewTextMemo } from './view-text-memo';
import { ViewTextMemosCache } from './view-text-memos-cache';

export class JsonText<K extends string, S extends StringRecordStruct> {
  private readonly logger: Logger | undefined;

  private readonly viewsCache;
  private readonly service;

  private syncDuringProcessingMessages = false;
  private localPushCounter = 0;

  private readonly textViewsMap: Record<K, KeySimpleText>;

  private readonly eventsOff;

  constructor(
    formatter: StructJsonFormatter<K, S>,
    service: Pick<
      CollabService,
      'viewText' | 'pushSelectionChangeset' | 'headRevision' | 'submitChanges'
    > & {
      eventBus: PickReadEmitter<
        CollabServiceEvents,
        | 'viewChanged'
        | 'appliedTypingOperation'
        | 'appliedRedo'
        | 'appliedUndo'
        | 'handledExternalChanges'
        | 'processingMessages'
        | 'headRevisionChanged'
        | 'userRecordsFilterNewestRecordIterable'
      >;
    },
    options?: {
      logger?: Logger;
    }
  ) {
    this.logger = options?.logger;

    const keys = formatter.keys;

    this.service = service;
    this.viewsCache = new ViewTextMemosCache<K, S>(formatter, service, {
      logger: this.logger?.extend('ViewTextMemosCache'),
    });

    const emptyView = formatter.stringify(formatter.parse(''));

    const keySimpleTextParent: ConstructorParameters<typeof KeySimpleText>[0]['service'] =
      {
        get viewText() {
          return service.viewText;
        },
        pushSelectionChangeset: this.pushSelectionChangeset.bind(this),
      };

    this.textViewsMap = Object.fromEntries(
      keys.map((key) => [
        key,
        new KeySimpleText(
          {
            service: keySimpleTextParent,
            view: new ViewTextKeyView(this.viewsCache, key),
            prevView: new ViewTextKeyPrevView(this.viewsCache, key),
            getClosestOlderRevisionView: (revision) => {
              const revisionView = this.viewsCache.getClosestOlderRevisionView(revision);
              if (!revisionView) {
                return;
              }

              return {
                value: revisionView.viewText,
                jsonValueOffset: revisionView.positionByKey[key].index,
                jsonValueLength: revisionView.positionByKey[key].length,
              };
            },
            formatter,
          },
          {
            logger: this.logger?.extend(key),
          }
        ),
      ])
    ) as Record<K, KeySimpleText>;
    const textViewsList = Object.values<KeySimpleText>(this.textViewsMap);

    this.eventsOff = [
      service.eventBus.on('viewChanged', (event) => {
        this.logger?.debug('viewChanged', {
          viewText: service.viewText,
          event: {
            change: event.change?.toString(),
            source: event.source,
            view: event.view.toString(),
          },
        });
        const view = this.viewsCache.newView(this.localPushCounter > 0);
        if (this.localPushCounter === 0) {
          this.logger?.debug('outsideChange.beforeSyncView', {
            serviceViewText: service.viewText,
            jsonViewText: view.viewText,
          });
          // Change happened outside this context, must ensure text is in sync with object structure
          if (this.syncView(view)) {
            // viewText had invalid structure
            return;
          }
        }

        this.viewsCache.pushView(view);

        textViewsList.forEach((textView) => {
          textView.serviceViewChanged();
        });
      }),
      service.eventBus.on('appliedTypingOperation', ({ operation: { selection } }) => {
        textViewsList.forEach((textView) => {
          textView.serviceSelectionChanged(selection);
        });
      }),
      service.eventBus.on('appliedRedo', () => {
        textViewsList.forEach((textView) => {
          textView.serviceAppliedRedo();
        });
      }),
      service.eventBus.on('appliedUndo', () => {
        textViewsList.forEach((textView) => {
          textView.serviceAppliedUndo();
        });
      }),
      service.eventBus.on('processingMessages', () => {
        this.syncDuringProcessingMessages = false;
      }),
      service.eventBus.on('handledExternalChanges', (payload) => {
        if (this.syncDuringProcessingMessages) {
          return;
        }

        textViewsList.forEach((textView) => {
          textView.serviceHandledExternalChange(payload);
        });
      }),
      service.eventBus.on('userRecordsFilterNewestRecordIterable', (filter) => {
        const record = filter.resultRecord;
        if (!record) {
          return;
        }

        // Prevent iterating any records past empty view
        if (
          record.changeset.hasOnlyInsertions() &&
          record.changeset.joinInsertions() === emptyView
        ) {
          this.logger?.debug(
            'newestRecordIterable.prevent',
            filter.resultRecord?.changeset.toString()
          );
          filter.resultRecord = null;
        }
      }),
    ];

    this.logger?.debug('constructor.beforeSyncView', {
      serviceViewText: service.viewText,
    });
    this.syncView(this.viewsCache.view, {
      submit: true,
      type: 'permanent',
    });
  }

  /**
   * Removes event listeners. This instance becomes useless.
   */
  cleanUp() {
    this.eventsOff.forEach((off) => {
      off();
    });
    this.viewsCache.cleanUp();
  }

  getText(key: K): SimpleText {
    return this.textViewsMap[key];
  }

  private pushSelectionChangeset(
    setChangeset: SelectionChangeset,
    options?: SimpleTextOperationOptions
  ) {
    try {
      this.localPushCounter++;
      this.service.pushSelectionChangeset(setChangeset, options);
    } finally {
      this.localPushCounter--;
    }
  }

  private syncView(
    view: ViewTextMemo<K, S>,
    options?: {
      submit?: boolean;
      type?: 'permanent' | 'merge';
    }
  ) {
    if (this.service.viewText !== view.viewText) {
      this.logger?.debug('syncView', {
        view,
      });
      this.syncDuringProcessingMessages = true;
      this.pushSelectionChangeset(
        {
          changeset: Changeset.fromInsertion(view.viewText),
          afterSelection: SelectionRange.ZERO,
        },
        {
          type: options?.type,
        }
      );
      if (options?.submit) {
        const submittedRecord = this.service.submitChanges();
        this.logger?.debug('syncView:submit', {
          sumbmit: submittedRecord,
          viewText: this.service.viewText,
        });
      }
      return true;
    } else {
      return false;
    }
  }
}
