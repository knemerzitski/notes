import { Changeset } from '../../changeset';
import { CollabService, CollabServiceEvents } from '../../client/collab-service';
import { SelectionRange } from '../../client/selection-range';
import { SelectionChangeset , LimitedEmitter , SimpleText, SimpleTextOperationOptions } from '../../types';

import { KeySimpleText } from './key-simple-text';
import { StructJsonFormatter } from './struct-json-formatter';
import { StringRecordStruct } from './types';
import { ViewTextKeyPrevView } from './view-text-key-prev-view';
import { ViewTextKeyView } from './view-text-key-view';
import { ViewTextMemo } from './view-text-memo';
import { ViewTextMemosCache } from './view-text-memos-cache';

export class JsonText<K extends string, S extends StringRecordStruct> {
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
      'viewText' | 'pushSelectionChangeset' | 'headRevision'
    > & {
      eventBus: Pick<
        LimitedEmitter<
          Pick<
            CollabServiceEvents,
            | 'viewChanged'
            | 'appliedTypingOperation'
            | 'handledExternalChanges'
            | 'processingMessages'
            | 'headRevisionChanged'
          >
        >,
        'on'
      >;
    }
  ) {
    const keys = formatter.keys;

    this.service = service;
    this.viewsCache = new ViewTextMemosCache<K, S>(formatter, service);

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
        new KeySimpleText({
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
        }),
      ])
    ) as Record<K, KeySimpleText>;
    const textViewsList = Object.values<KeySimpleText>(this.textViewsMap);

    this.eventsOff = [
      service.eventBus.on('viewChanged', () => {
        const view = this.viewsCache.newView(this.localPushCounter > 0);
        if (this.localPushCounter === 0) {
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
    ];

    this.syncView(this.viewsCache.view, true);
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

  private syncView(view: ViewTextMemo<K, S>, merge = false) {
    if (this.service.viewText !== view.viewText) {
      this.syncDuringProcessingMessages = true;
      this.pushSelectionChangeset(
        {
          changeset: Changeset.fromInsertion(view.viewText),
          afterSelection: SelectionRange.ZERO,
        },
        {
          merge,
        }
      );
      return true;
    } else {
      return false;
    }
  }
}
