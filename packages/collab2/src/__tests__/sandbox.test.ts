import { it } from 'vitest';
import { createCollabSandbox } from './helpers/collab-sandbox';
import { logAll } from '../../../utils/src/log-all';

// TODO remove
it.skip('sandbox', () => {
  const fieldNames = ['title', 'content'];

  const {
    server,
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
    client: {
      jsonTyper: {
        fieldNames,
      },
    },
  });

  A.submitChangesInstant();
  const B = server.createClient('B', {
    jsonTyper: {
      fieldNames,
    },
  });


  const A_content = A.getField('content');
  A_content.insert('f\n\no"o');
  A.submitChangesInstant();

  const B_title = B.getField('title');
  B_title.insert('bar""');
  B.submitChangesInstant();

  logAll({
    A: {
      fields: A.getFieldTextsWithSelection(),
      viewText: A.getViewTextWithSelection(),
    },
    B: {
      fields: B.getFieldTextsWithSelection(),
      viewText: B.getViewTextWithSelection(),
    },
  });
});
