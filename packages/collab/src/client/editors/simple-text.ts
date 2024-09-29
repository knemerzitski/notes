import mitt, { Emitter, EmitterPickEvents } from 'mitt';
import { CollabService } from '../collab-service';
import { SelectionRange } from '../selection-range';
import { SimpleText, SimpleTextEvents, SimpleTextOperationOptions } from '../types';
import { deleteCountToSelectionChangeset } from './utils/delete-count-to-selection-changeset';
import { insertToSelectionChangeset } from './utils/insert-to-selection-changeset';

export class SimpleTextEditor implements SimpleText {
  readonly eventBus: Emitter<SimpleTextEvents>;

  private readonly service;

  get value() {
    return this.service.viewText;
  }

  private eventsOff: (() => void)[];

  constructor(
    service: Pick<CollabService, 'viewText' | 'pushSelectionChangeset'> & {
      eventBus: EmitterPickEvents<
        CollabService['eventBus'],
        'viewChanged' | 'appliedTypingOperation' | 'handledExternalChanges'
      >;
    }
  ) {
    this.service = service;

    this.eventBus = mitt();

    this.eventsOff = [
      service.eventBus.on('viewChanged', () => {
        this.eventBus.emit('valueChanged', service.viewText);
      }),
      service.eventBus.on('appliedTypingOperation', ({ operation }) => {
        this.eventBus.emit('selectionChanged', operation.selection);
      }),
      service.eventBus.on('handledExternalChanges', (events) => {
        this.eventBus.emit(
          'handledExternalChanges',
          events.map(({ event, revision }) => ({
            changeset: event.viewComposable,
            revision,
          }))
        );
      }),
    ];
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
