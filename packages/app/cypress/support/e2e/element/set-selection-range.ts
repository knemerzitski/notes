export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      setSelectionRange: (start: number, end: number) => Chainable<void>;
    }
  }
}

Cypress.Commands.add(
  'setSelectionRange',
  { prevSubject: 'element' },
  (subject: JQuery, start: number, end: number) => {
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
    inputEl.setSelectionRange(start, end, 'forward');
  }
);
