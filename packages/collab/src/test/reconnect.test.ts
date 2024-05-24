import { beforeEach, describe, expect, it } from 'vitest';

import { createHelperCollabEditingEnvironment } from './helpers/server-client';

describe('single user', () => {
  let helper: ReturnType<typeof createHelperCollabEditingEnvironment>;

  beforeEach(() => {
    helper = createHelperCollabEditingEnvironment();
  });

  it('can undo "d" after setting new headText', () => {
    const { server } = helper;

    const clientA = helper.addNewClient('A', 'user1');
    const clientB = helper.addNewClient('B', 'user1');

    clientA.insertText('a');
    clientA.submitChangesInstant();
    clientA.insertText('b');
    clientA.submitChangesInstant();
    clientB.disconnect();
    clientA.insertText('c');
    clientA.submitChangesInstant();
    clientA.insertText('d');
    clientA.submitChangesInstant();
    clientB.connect();

    const headText = server.localRecords.getHeadText();

    clientB.editor.replaceHeadText(headText);
    clientB.editor.undo();

    expect(clientB.valueWithSelection()).toStrictEqual('abc>');
  });
});
