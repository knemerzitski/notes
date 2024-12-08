import mitt, { Emitter } from 'mitt';

import { CollabService, CollabServiceEvents } from '../../client/collab-service';
import { SelectionRange } from '../../client/selection-range';

import { LimitedEmitter , SimpleText, SimpleTextEvents, SimpleTextOperationOptions } from '../../types';

import { deleteCountToSelectionChangeset } from './delete-count-to-selection-changeset';
import { insertToSelectionChangeset } from './insert-to-selection-changeset';


export class SimpleTextEditor implements SimpleText {
  private readonly _eventBus: Emitter<SimpleTextEvents>;
  get eventBus(): Pick<Emitter<SimpleTextEvents>, 'on' | 'off'> {
    return this._eventBus;
  }

  private readonly service;

  get value() {
    return this.service.viewText;
  }

  private eventsOff: (() => void)[];

  constructor(
    service: Pick<CollabService, 'viewText' | 'pushSelectionChangeset'> & {
      eventBus: Pick<
        LimitedEmitter<
          Pick<
            CollabServiceEvents,
            'viewChanged' | 'appliedTypingOperation' | 'handledExternalChanges'
          >
        >,
        'on'
      >;
    }
  ) {
    this.service = service;

    this._eventBus = mitt();

    this.eventsOff = [
      service.eventBus.on('viewChanged', () => {
        this._eventBus.emit('valueChanged', service.viewText);
      }),
      service.eventBus.on('appliedTypingOperation', ({ operation }) => {
        this._eventBus.emit('selectionChanged', operation.selection);
      }),
      service.eventBus.on('handledExternalChanges', (events) => {
        this._eventBus.emit(
          'handledExternalChanges',
          events.map(({ event, revision }) => ({
            changeset: event.viewComposable,
            revision,
          }))
        );
      }),
    ];
  }

  getCollabServiceSelection(selection: SelectionRange): SelectionRange {
    return selection;
  }

  cleanUp() {
    this.eventsOff.forEach((off) => {
      off();
    });
  }

  insert(
    insertText: string,
    selection: SelectionRange,
    options?: SimpleTextOperationOptions
  ) {
    this.service.pushSelectionChangeset(
      insertToSelectionChangeset(insertText, this.service.viewText, selection),
      options
    );
  }

  delete(count = 1, selection: SelectionRange, options?: SimpleTextOperationOptions) {
    this.service.pushSelectionChangeset(
      deleteCountToSelectionChangeset(count, this.service.viewText, selection),
      options
    );
  }
}
