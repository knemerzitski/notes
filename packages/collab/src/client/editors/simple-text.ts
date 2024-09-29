import mitt, { Emitter, EmitterPickEvents } from 'mitt';
import { CollabEditor } from '../collab-editor';
import { SelectionRange } from '../selection-range';
import { SimpleText, SimpleTextEvents, SimpleTextOperationOptions } from '../types';
import { deleteCountToSelectionChangeset } from './utils/delete-count-to-selection-changeset';
import { insertToSelectionChangeset } from './utils/insert-to-selection-changeset';

export class SimpleTextEditor implements SimpleText {
  readonly eventBus: Emitter<SimpleTextEvents>;

  private readonly editor;

  get value() {
    return this.editor.viewText;
  }

  private eventsOff: (() => void)[];

  constructor(
    editor: Pick<CollabEditor, 'viewText' | 'pushSelectionChangeset'> & {
      eventBus: EmitterPickEvents<
        CollabEditor['eventBus'],
        'viewChanged' | 'appliedTypingOperation' | 'handledExternalChanges'
      >;
    }
  ) {
    this.editor = editor;

    this.eventBus = mitt();

    this.eventsOff = [
      editor.eventBus.on('viewChanged', () => {
        this.eventBus.emit('valueChanged', editor.viewText);
      }),
      editor.eventBus.on('appliedTypingOperation', ({ operation }) => {
        this.eventBus.emit('selectionChanged', operation.selection);
      }),
      editor.eventBus.on('handledExternalChanges', (events) => {
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
    this.editor.pushSelectionChangeset(
      insertToSelectionChangeset(insertText, this.editor.viewText, selection),
      options
    );
  }

  delete(count = 1, selection: SelectionRange, options?: SimpleTextOperationOptions) {
    this.editor.pushSelectionChangeset(
      deleteCountToSelectionChangeset(count, this.editor.viewText, selection),
      options
    );
  }
}
