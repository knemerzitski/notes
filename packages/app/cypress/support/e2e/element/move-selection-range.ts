export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      moveSelectionRange: (offset: number) => Chainable<void>;
    }
  }
}

Cypress.Commands.add(
  'moveSelectionRange',
  { prevSubject: 'element' },
  (subject: JQuery, offset: number) => {
    const el = subject.get()[0];
    if (
      el == null ||
      !['HTMLInputElement', 'HTMLTextAreaElement'].includes(el.constructor.name)
    ) {
      throw new Error(`Expected an input element but got "${el?.constructor.name}"`);
    }

    const inputEl = el as HTMLInputElement | HTMLTextAreaElement;

    // Must focus or setSelectionRange will have no effect
    inputEl.focus();
    inputEl.setSelectionRange(
      (inputEl.selectionStart ?? 0) + offset,
      (inputEl.selectionEnd ?? 0) + offset,
      inputEl.selectionDirection ?? 'none'
    );
    cy.log('moveSelectionRange', offset);
  }
);
