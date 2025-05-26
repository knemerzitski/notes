import mitt from 'mitt';

import { CollabService, Selection } from '../../../../../collab/src';
import { NoteTextFieldEditor } from '../../../../src/note/types';

import { SimpleTextFieldsOperationsQueue } from './simple-text-fields-operations-queue';
import { FieldEditor, TextOperationOptions } from './types';

export class SimpleTextField implements FieldEditor {
  readonly eventBus = mitt<{
    selectionChanged: undefined;
  }>();

  selection = Selection.ZERO;
  selectionRevision: number;

  get value() {
    return this.field.value;
  }

  constructor(
    readonly field: NoteTextFieldEditor,
    private readonly service: CollabService,
    private readonly queue: SimpleTextFieldsOperationsQueue
  ) {
    this.field.on('selection:changed', ({ newSelection }) => {
      this.selection = newSelection;
    });

    field.on('selection:changed', ({ newSelection }) => {
      this.selection = newSelection;
      this.selectionRevision = service.serverRevision;
    });

    field.on('externalTyping:applied', ({ changeset }) => {
      const newSelection = this.selection.follow(changeset, true);

      this.selection = newSelection;
      this.selectionRevision = this.service.serverRevision;
    });
  }

  getValue(): PromiseLike<string> {
    return Promise.resolve(this.field.value);
  }

  private _insert(value: string, options?: TextOperationOptions) {
    if (options?.noSubmit) {
      this.field.insert(value, this.selection);
    } else {
      this.queue.pushOperation({
        simpleField: this,
        type: 'insert',
        value,
        options,
      });
    }
  }

  insert(value: string, options?: TextOperationOptions) {
    const delay = options?.delay ?? 10;
    if (delay <= 0) {
      this._insert(value, options);
    } else {
      value.split('').forEach((char) => {
        this._insert(char, {
          ...options,
          delay,
        });
      });
    }
  }

  _delete(count: number, options?: TextOperationOptions) {
    if (options?.noSubmit) {
      this.field.delete(count, this.selection);
    } else {
      this.queue.pushOperation({
        simpleField: this,
        type: 'delete',
        count,
        options,
      });
    }
  }

  delete(count: number, options?: TextOperationOptions) {
    const delay = options?.delay ?? 10;
    if (delay <= 0) {
      this._delete(count, options);
    } else {
      [...new Array<undefined>(count)].forEach(() => {
        this._delete(1, options);
      });
    }
  }

  select(start: number, end?: number, options?: Omit<TextOperationOptions, 'noSubmit'>) {
    this.queue.pushOperation({
      simpleField: this,
      type: 'selectOffset',
      offset: Selection.create(start, end).subtract(this.selection),
      options,
    });
  }

  selectOffset(offset: number, options?: Omit<TextOperationOptions, 'noSubmit'>) {
    this.queue.pushOperation({
      simpleField: this,
      type: 'selectOffset',
      offset: Selection.create(offset),
      options,
    });
  }

  getServiceSelection() {
    return {
      revision: this.selectionRevision,
      selection: this.field.toServiceSelection(this.selection),
    };
  }
}
