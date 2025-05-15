import { expect, it } from 'vitest';
import { createCollabSandbox } from './helpers/collab-sandbox';

// TODO remove
it('sandbox', () => {
  const {
    server,
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('a');
  A.submitChangesInstant();
  A.disconnect();

  const A2 = server.createClient('A2', {
    userId: 'A',
  });
  A2.setCaret(-1);
  A2.insert('b');
  A2.submitChangesInstant();

  B.insert('[B]');
  B.submitChangesInstant();

  A.reconnect();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"a│"`);

  A.catchUpToServer();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"[B]a│b"`);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"[B]a│"`);
  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"[B]│"`);

  A.redo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"[B]a│"`);
  A.redo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"[B]ab│"`);
});
