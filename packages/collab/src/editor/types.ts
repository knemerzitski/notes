import { Emitter } from 'mitt';
import { Changeset } from '../changeset';
import { SelectionRange } from '../client/selection-range';

export interface SimpleTextEvents {
  handledExternalChanges: readonly Readonly<{ changeset: Changeset; revision: number }>[];
  valueChanged: string;
  selectionChanged: Readonly<SelectionRange>;
}

export interface SimpleText {
  readonly eventBus: Emitter<SimpleTextEvents>;

  readonly value: string;

  /**
   * Insert value at selection. Anything selected is replaced with new value.
   */
  insert(
    value: string,
    selection: SelectionRange,
    options?: SimpleTextOperationOptions
  ): void;

  /**
   * Delete at selection. Anything selected is deleted before count.
   */
  delete(
    count: number,
    selection: SelectionRange,
    options?: SimpleTextOperationOptions
  ): void;
}

export interface SimpleTextOperationOptions {
  /**
   * Merge value with existing
   * @default false
   */
  merge?: boolean;
}