import { expect, it } from 'vitest';
import { createCollabSandbox } from './helpers/collab-sandbox';

it('undo twice after reset', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
  });

  A.insert('a');
  A.submitChangesInstant();
  A.undo();
  A.submitChangesInstant();

  A.reset();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"│"`);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"a│"`);
  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"a│"`);
});

it('undo and redo twice after reset', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
  });

  A.insert('a');
  A.submitChangesInstant();
  A.undo();
  A.submitChangesInstant();

  A.reset();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"│"`);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"a│"`);
  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"a│"`);

  A.redo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"a│a"`);
  A.redo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"│a"`);
});
