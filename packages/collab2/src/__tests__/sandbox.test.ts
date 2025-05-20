import { it } from 'vitest';

import { logAll } from '../../../utils/src/log-all';

import { createCollabSandbox } from './helpers/collab-sandbox';

// TODO remove
it.skip('sandbox', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
  });

  function log(msg?: string) {
    logAll(msg, A.getViewTextWithSelection());
  }

  A.insert('a');
  A.submitChangesInstant();
  A.undo();
  A.submitChangesInstant();

  A.reset();
  console.log('reset');
  log();

  A.undo();
  log('undo');
  A.undo();
  log('undo');

  A.redo();
  logAll(A.getDebugObject());
  log('redo');

  A.redo();
  log('redo');
});
