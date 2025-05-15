import { Emitter } from 'mitt';
import { Changeset } from '../../common/changeset';
import { Selection } from '../../common/selection';

export interface TyperBaseEvent {
  readonly typer: Typer;
}

export interface TyperEvents {
  'externalTyping:applied': {
    readonly changeset: Changeset;
  } & TyperBaseEvent;
  'value:changed': {
    readonly newValue: string;
  } & TyperBaseEvent;
  'undo:applied': TyperBaseEvent;
  'redo:applied': TyperBaseEvent;
  'selection:changed': {
    /**
     * Selection can change due to user typing or moving caret
     */
    readonly source: 'typing' | 'movement';
    readonly newSelection: Selection;
  } & TyperBaseEvent;
}

export interface PublicTyperEvents {
  'selection:changed': {
    readonly newSelection: Selection;
  };
}

export interface Typer {
  readonly value: string;

  readonly on: Emitter<TyperEvents>['on'];
  readonly off: Emitter<TyperEvents>['off'];
  readonly emit: Emitter<PublicTyperEvents>['emit'];

  /**
   * Insert value at while having given selection. Anything selected is replaced with new value.
   */
  insert(value: string, selection: Selection, options?: TypingOptions): void;

  /**
   * Delete while having given selection. Anything selected is deleted before count.
   * Deletion is counted from right to left.
   */
  delete(count: number, selection: Selection, options?: TypingOptions): void;

  toTyperSelection(selection: Selection): Selection | undefined;

  toServiceSelection(selection: Selection): Selection | undefined;
}

export interface TypingOptions {
  /**
   * `merge` - Merge typing with previous typing. Undo will revert both typings at once. \
   * `permanent` - Make this typing permanent. It can never be reverted by undo.
   */
  historyType?: 'merge' | 'permanent';
}
