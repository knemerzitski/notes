import { Selection } from '../../../../../collab/src';

import { FieldEditor, TextOperationOptions } from './types';

export class CyElementField implements FieldEditor {
  constructor(private readonly getChainableEl: () => Cypress.Chainable<JQuery>) {}

  getValue() {
    return this.getChainableEl()
      .invoke('val')
      .then((value) => {
        if (typeof value !== 'string') {
          throw new Error(`Unexpected value is not string "${String(value)}"`);
        }
        return value;
      });
  }

  insert(value: string, options?: TextOperationOptions) {
    this.getChainableEl().type(value, {
      delay: options?.delay,
    });
  }

  delete(count: number, _options?: TextOperationOptions) {
    this.getChainableEl().type('{backspace}'.repeat(count));
  }

  selectOffset(offset: number, _options?: TextOperationOptions): void {
    this.getChainableEl().moveSelectionRange(offset);
  }

  select(start: number, end?: number, _options?: TextOperationOptions) {
    const selection = Selection.create(start, end);
    this.getChainableEl().setSelectionRange(selection.start, selection.end);
  }

  type(value: string, options?: TextOperationOptions) {
    this.getChainableEl().type(value, options);
  }
}
