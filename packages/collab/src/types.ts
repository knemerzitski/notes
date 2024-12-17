import { BaseEvents, Emitter, Handler } from 'mitt';

import { Changeset } from './changeset';
import { SelectionRange } from './client/selection-range';

/**
 * Changeset with selection before and after it's composed
 */
export interface SelectionChangeset {
  /**
   * Changeset to be composed
   */
  changeset: Changeset;
  /**
   * Selection after changeset is composed
   */
  afterSelection: SelectionRange;
  /**
   * Selection before changeset is composed
   */
  beforeSelection?: SelectionRange;
}

export interface SimpleTextEvents {
  handledExternalChanges: readonly Readonly<{ changeset: Changeset; revision: number }>[];
  valueChanged: string;
  selectionChanged: Readonly<SelectionRange>;
}

export interface SimpleText {
  readonly eventBus: Pick<Emitter<SimpleTextEvents>, 'on' | 'off'>;

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

  /**
   * @param selection This editor selection
   * @returns Selection that applies to CollabService text
   */
  transformToServiceSelection(selection: SelectionRange): SelectionRange;

  /**
   * @param selection CollabService selection
   * @returns Selection that applies to this editor if defined
   */
  transformToEditorSelection(selection: SelectionRange): SelectionRange | undefined;
}

export interface SimpleTextOperationOptions {
  /**
   * Merge value with existing
   * @default false
   */
  merge?: boolean;
}

export interface LimitedEmitter<Events extends BaseEvents> {
  on<Key extends keyof Events>(
    type: Key | Key[],
    handler: Handler<Events[Key]>
  ): () => void;
  off<Key extends keyof Events>(type: Key, handler?: Handler<Events[Key]>): void;
  emit<Key extends keyof Events>(type: Key, event: Events[Key]): void;
  emit<Key extends keyof Events>(type: undefined extends Events[Key] ? Key : never): void;
}
